// Minimal entity store. Entities are plain objects with an id and a `tags` map; step 2 expands this.
export class World {
  constructor() { this.entities = new Map(); this.nextId = 1; }
  add(e) { e.id = this.nextId++; if (!e.tags) e.tags = {}; this.entities.set(e.id, e); return e; }
  remove(e) { this.entities.delete(e.id); }
  count() { return this.entities.size; }
  *withTag(tag) { for (const e of this.entities.values()) if (tag in e.tags) yield e; }
  countTag(tag) { let n = 0; for (const e of this.entities.values()) if (tag in e.tags) n++; return n; }
  all() { return this.entities.values(); }
}
