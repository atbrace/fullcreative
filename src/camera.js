// ================================================================
//  AUTO-CAMERA (Documentary Mode)
// ================================================================
class AutoCamera {
  constructor() {
    this.enabled = false;
    this.scene = null;        // { type, key, score, zoom, dwellTime, data, startTick }
    this.dwellRemaining = 0;
    this.cooldowns = new Map(); // sceneKey -> lastViewedTick
    this._lastTick = 0;
    this._evalCounter = 0;
    this._labelEl = null;
    this._badgeEl = null;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this._badgeEl) this._badgeEl = document.getElementById('doc-badge');
    if (!this._labelEl) this._labelEl = document.getElementById('scene-label');
    if (this._badgeEl) this._badgeEl.classList.toggle('visible', this.enabled);
    if (!this.enabled) {
      this.scene = null;
      this.dwellRemaining = 0;
      if (this._labelEl) this._labelEl.classList.remove('visible');
    }
  }

  update(world, renderer) {
    if (!this.enabled || world.selected) {
      // Yield to manual selection - hide label but stay enabled
      if (this._labelEl && world.selected) this._labelEl.classList.remove('visible');
      this._lastTick = world.tick;
      return;
    }

    const elapsed = Math.max(0, world.tick - this._lastTick);
    this._lastTick = world.tick;

    this.dwellRemaining -= elapsed;
    this._evalCounter += elapsed;

    // Update current scene position for moving targets
    if (this.scene) {
      const pos = this._scenePosition(this.scene, world);
      if (pos === null) {
        // Scene ended (creature died, chase resolved, etc)
        this.scene = null;
        this.dwellRemaining = 0;
      } else {
        renderer.camTarget.x = pos.x;
        renderer.camTarget.y = pos.y;
        renderer.camTarget.zoom = pos.zoom;
      }
    }

    // Evaluate candidates every 30 ticks
    if (this._evalCounter >= 30) {
      this._evalCounter = 0;
      const candidates = this._evaluateScenes(world);

      if (candidates.length > 0) {
        const best = candidates[0];

        if (!this.scene || this.dwellRemaining <= 0) {
          // Adopt best candidate
          this._adoptScene(best, world);
        } else if (best.effectiveScore > this.scene.score * 2) {
          // Urgent interrupt - something much more interesting
          this._adoptScene(best, world);
        }
      } else if (!this.scene || this.dwellRemaining <= 0) {
        // Nothing interesting - overview
        this._adoptScene({
          type: 'overview', key: 'overview',
          score: 5, effectiveScore: 5,
          zoom: 1, dwellTime: 600,
          data: { x: renderer.w / 2, y: renderer.h / 2 }
        }, world);
      }
    }

    // If no scene yet, set default
    if (!this.scene) {
      renderer.camTarget.x = renderer.w / 2;
      renderer.camTarget.y = renderer.h / 2;
      renderer.camTarget.zoom = 1;
    }
  }

  _adoptScene(candidate, world) {
    this.scene = {
      type: candidate.type,
      key: candidate.key,
      score: candidate.score,
      zoom: candidate.zoom,
      dwellTime: candidate.dwellTime,
      data: candidate.data,
      startTick: world.tick
    };
    this.dwellRemaining = candidate.dwellTime;
    this.cooldowns.set(candidate.key, world.tick);
  }

  updateLabel() {
    if (!this._labelEl) this._labelEl = document.getElementById('scene-label');
    if (!this._labelEl) return;

    if (!this.enabled || !this.scene) {
      this._labelEl.classList.remove('visible');
      return;
    }

    const text = this._sceneLabel(this.scene);
    if (text) {
      this._labelEl.textContent = text;
      this._labelEl.classList.add('visible');
    } else {
      this._labelEl.classList.remove('visible');
    }
  }

  _evaluateScenes(world) {
    const candidates = [];
    this._scoreChases(world, candidates);
    this._scoreCoopClusters(world, candidates);
    this._scoreCatastrophe(world, candidates);
    this._scoreElders(world, candidates);

    // Apply cooldown modifiers
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const lastViewed = this.cooldowns.get(c.key);
      let mult = 1;
      if (lastViewed !== undefined) {
        const ago = world.tick - lastViewed;
        if (ago < 600) mult = 0.1;
        else if (ago < 1800) mult = 0.3;
      } else {
        mult = 1.2; // freshness bonus
      }
      c.effectiveScore = c.score * mult;
    }

    // Sort by effective score descending
    candidates.sort((a, b) => b.effectiveScore - a.effectiveScore);
    return candidates;
  }

  _scoreChases(world, out) {
    const pairs = world.chasePairs;
    if (pairs.length < 2) return;

    // Collect chase midpoints
    const chases = [];
    for (let i = 0; i < pairs.length; i += 2) {
      const pred = pairs[i], prey = pairs[i + 1];
      if (!pred.alive || !prey.alive) continue;
      chases.push({
        mx: (pred.pos.x + prey.pos.x) / 2,
        my: (pred.pos.y + prey.pos.y) / 2,
        pred, prey
      });
    }

    if (chases.length === 0) return;

    // Find clusters of nearby chases (within 120px)
    const used = new Uint8Array(chases.length);
    const CLUSTER_DIST = 120;
    const CLUSTER_D2 = CLUSTER_DIST * CLUSTER_DIST;

    for (let i = 0; i < chases.length; i++) {
      if (used[i]) continue;
      const cluster = [i];
      used[i] = 1;

      // Greedy: add nearby chases
      for (let j = i + 1; j < chases.length; j++) {
        if (used[j]) continue;
        const dx = chases[j].mx - chases[i].mx;
        const dy = chases[j].my - chases[i].my;
        if (dx * dx + dy * dy < CLUSTER_D2) {
          cluster.push(j);
          used[j] = 1;
        }
      }

      if (cluster.length >= 3) {
        // Chase cluster
        let cx = 0, cy = 0;
        const creatures = [];
        for (let k = 0; k < cluster.length; k++) {
          const ch = chases[cluster[k]];
          cx += ch.mx; cy += ch.my;
          creatures.push(ch.pred, ch.prey);
        }
        cx /= cluster.length; cy /= cluster.length;
        const score = 120 + (cluster.length - 3) * 18;
        out.push({
          type: 'chase_cluster', key: 'chaseclust_' + Math.round(cx / 50),
          score, zoom: 2.0, dwellTime: 240,
          data: { creatures, cx, cy },
          effectiveScore: 0
        });
      } else {
        // Single chase
        const ch = chases[cluster[0]];
        out.push({
          type: 'chase', key: 'chase_' + ch.pred.id + '_' + ch.prey.id,
          score: 80, zoom: 3.0, dwellTime: 180,
          data: { pred: ch.pred, prey: ch.prey },
          effectiveScore: 0
        });
      }
    }
  }

  _scoreCoopClusters(world, out) {
    const pairs = world.coopPairs;
    if (pairs.length < 6) return; // need at least 3 pairs

    // Collect unique cooperating creatures
    const creatures = [];
    const seen = new Set();
    for (let i = 0; i < pairs.length; i += 2) {
      const a = pairs[i], b = pairs[i + 1];
      if (!seen.has(a.id) && a.alive) { seen.add(a.id); creatures.push(a); }
      if (!seen.has(b.id) && b.alive) { seen.add(b.id); creatures.push(b); }
    }

    if (creatures.length < 3) return;

    // Simple spatial clustering - find groups within COOP_RANGE * 2
    const range = CFG.COOP_RANGE * 2;
    const range2 = range * range;
    const used = new Uint8Array(creatures.length);

    for (let i = 0; i < creatures.length; i++) {
      if (used[i]) continue;
      const cluster = [i];
      used[i] = 1;

      for (let j = i + 1; j < creatures.length; j++) {
        if (used[j]) continue;
        const dx = creatures[j].pos.x - creatures[i].pos.x;
        const dy = creatures[j].pos.y - creatures[i].pos.y;
        if (dx * dx + dy * dy < range2) {
          cluster.push(j);
          used[j] = 1;
        }
      }

      if (cluster.length >= 3) {
        let cx = 0, cy = 0;
        const members = [];
        for (let k = 0; k < cluster.length; k++) {
          const c = creatures[cluster[k]];
          cx += c.pos.x; cy += c.pos.y;
          members.push(c);
        }
        cx /= cluster.length; cy /= cluster.length;
        out.push({
          type: 'coop_cluster', key: 'coop_' + Math.round(cx / 60),
          score: 55, zoom: 2.2, dwellTime: 480,
          data: { members, cx, cy },
          effectiveScore: 0
        });
      }
    }
  }

  _scoreCatastrophe(world, out) {
    if (!world.catastrophe) return;
    const cat = world.catastrophe;
    const age = world.tick - cat.startTick;

    if (cat.type === 'impact') {
      const remaining = cat.duration - age;
      if (remaining > 0) {
        out.push({
          type: 'catastrophe', key: 'impact_' + cat.startTick,
          score: 150, zoom: 1.8, dwellTime: Math.min(remaining, 360),
          data: { x: cat.data.x, y: cat.data.y, subtype: 'impact' },
          effectiveScore: 0
        });
      }
    } else {
      // Drought or plague - global view
      out.push({
        type: 'catastrophe', key: cat.type + '_' + cat.startTick,
        score: 40, zoom: 1.2, dwellTime: 300,
        data: { x: world.w / 2, y: world.h / 2, subtype: cat.type },
        effectiveScore: 0
      });
    }
  }

  _scoreElders(world, out) {
    const creatures = world.creatures;
    if (creatures.length < 5) return;

    // Find average generation and max generation creature
    let totalGen = 0, maxGen = 0, elder = null;
    for (let i = 0; i < creatures.length; i++) {
      totalGen += creatures[i].generation;
      if (creatures[i].generation > maxGen) {
        maxGen = creatures[i].generation;
        elder = creatures[i];
      }
    }

    const avgGen = totalGen / creatures.length;
    if (elder && maxGen > avgGen * 1.5 && maxGen > 3) {
      out.push({
        type: 'elder', key: 'elder_' + elder.id,
        score: 25, zoom: 2.5, dwellTime: 360,
        data: { creature: elder },
        effectiveScore: 0
      });
    }
  }

  _scenePosition(scene, world) {
    switch (scene.type) {
      case 'chase': {
        const p = scene.data.pred, q = scene.data.prey;
        if (!p.alive || !q.alive) return null;
        return {
          x: (p.pos.x + q.pos.x) / 2,
          y: (p.pos.y + q.pos.y) / 2,
          zoom: scene.zoom
        };
      }
      case 'chase_cluster': {
        let cx = 0, cy = 0, n = 0;
        const crs = scene.data.creatures;
        for (let i = 0; i < crs.length; i++) {
          if (crs[i].alive) { cx += crs[i].pos.x; cy += crs[i].pos.y; n++; }
        }
        if (n < 2) return null;
        return { x: cx / n, y: cy / n, zoom: scene.zoom };
      }
      case 'coop_cluster': {
        let cx = 0, cy = 0, n = 0;
        const ms = scene.data.members;
        for (let i = 0; i < ms.length; i++) {
          if (ms[i].alive) { cx += ms[i].pos.x; cy += ms[i].pos.y; n++; }
        }
        if (n < 2) return null;
        return { x: cx / n, y: cy / n, zoom: scene.zoom };
      }
      case 'catastrophe':
        return { x: scene.data.x, y: scene.data.y, zoom: scene.zoom };
      case 'elder': {
        const c = scene.data.creature;
        if (!c.alive) return null;
        return { x: c.pos.x, y: c.pos.y, zoom: scene.zoom };
      }
      case 'overview':
        return { x: scene.data.x, y: scene.data.y, zoom: scene.zoom };
      default:
        return null;
    }
  }

  _sceneLabel(scene) {
    switch (scene.type) {
      case 'chase':
        return 'predation in progress';
      case 'chase_cluster':
        return 'multi-predator engagement';
      case 'coop_cluster':
        return 'cooperative cluster';
      case 'catastrophe':
        if (scene.data.subtype === 'impact') return 'asteroid impact zone';
        if (scene.data.subtype === 'drought') return 'drought conditions';
        if (scene.data.subtype === 'plague') return 'plague spreading';
        return 'environmental event';
      case 'elder':
        return 'elder specimen - gen ' + (scene.data.creature.alive ? scene.data.creature.generation : '?');
      case 'overview':
        return '';
      default:
        return '';
    }
  }
}
