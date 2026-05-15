/**
 * Database schema — the single source of truth for the data model.
 *
 * Conventions:
 * - Every user-owned table has `user_id` FK to `users.id` with onDelete cascade
 * - Drop zones are a global catalogue (not user-owned); `created_by_user_id` is nullable
 * - Money stored as integer pence (never floats)
 * - Timestamps are timezone-aware (`timestamptz`)
 * - Primary keys are UUIDs unless a composite natural key is more correct
 *
 * See docs/ARCHITECTURE.md §3 for design rationale.
 * See docs/data-model.svg for the visual.
 */

import { sql } from 'drizzle-orm'
import { relations } from 'drizzle-orm'
import {
  pgTable, pgEnum, uuid, text, integer, date, timestamp,
  doublePrecision, primaryKey, unique, index, check,
} from 'drizzle-orm/pg-core'

// ─── enums ─────────────────────────────────────────────────────────────────

export const equipmentKind = pgEnum('equipment_kind', [
  'container',
  'main_canopy',
  'reserve_canopy',
  'aad',
  'altimeter',
  'helmet',
  'audible',
  'jumpsuit',
  'goggles',
  'other',
])

export const tagCategory = pgEnum('tag_category', [
  'progression',
  'discipline',
  'event_type',
  'role',
  'custom',
])

export const photoKind = pgEnum('photo_kind', [
  'logbook_page',
  'jump_action',
  'gear',
  'other',
])

// ─── users ─────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  entraObjectId: text('entra_object_id').unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull().defaultNow(),
})

// ─── drop_zones (global catalogue) ─────────────────────────────────────────

export const dropZones = pgTable('drop_zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  country: text('country').notNull(),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  iataCode: text('iata_code'),
  createdByUserId: uuid('created_by_user_id')
    .references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull().defaultNow(),
})

// ─── equipment (user-owned only) ───────────────────────────────────────────

export const equipment = pgTable('equipment', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  kind: equipmentKind('kind').notNull(),
  make: text('make'),
  model: text('model'),
  serialNumber: text('serial_number'),
  sizeFt2: integer('size_ft2'),                    // canopies only
  purchaseDate: timestamp('purchase_date', { withTimezone: true }),
  purchasePricePence: integer('purchase_price_pence'),
  retiredAt: timestamp('retired_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull().defaultNow(),
})

// ─── tags ──────────────────────────────────────────────────────────────────

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: tagCategory('category').notNull().default('custom'),
  canonicalKey: text('canonical_key'),
  colour: text('colour'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull().defaultNow(),
}, (table) => ({
  uniquePerUser: unique('tags_user_name_unique').on(table.userId, table.name),
}))

// ─── jumps (the centre of gravity) ─────────────────────────────────────────

export const jumps = pgTable('jumps', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // required
  jumpNumber: integer('jump_number').notNull(),
  date: date('date').notNull(),

  // optional
  dropZoneId: uuid('drop_zone_id')
    .references(() => dropZones.id, { onDelete: 'set null' }),
  aircraft: text('aircraft'),
  exitAltitudeFt: integer('exit_altitude_ft'),
  deployAltitudeFt: integer('deploy_altitude_ft'),
  delaySeconds: integer('delay_seconds'),
  canopySizeFt2: integer('canopy_size_ft2'),
  description: text('description'),
  authoriser: text('authoriser'),

  // audit + lifecycle
  ocrSourceId: uuid('ocr_source_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
}, (table) => ({
  uniqueJumpNumber: unique('jumps_user_number_unique')
    .on(table.userId, table.jumpNumber),
  userDateIdx: index('jumps_user_date_idx').on(table.userId, table.date),
}))

// ─── jump_tags (junction: M:N) ─────────────────────────────────────────────

export const jumpTags = pgTable('jump_tags', {
  jumpId: uuid('jump_id')
    .notNull()
    .references(() => jumps.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.jumpId, table.tagId] }),
}))

// ─── jump_equipment (junction: M:N) ────────────────────────────────────────

export const jumpEquipment = pgTable('jump_equipment', {
  jumpId: uuid('jump_id')
    .notNull()
    .references(() => jumps.id, { onDelete: 'cascade' }),
  equipmentId: uuid('equipment_id')
    .notNull()
    .references(() => equipment.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.jumpId, table.equipmentId] }),
}))

// ─── jump_partners (child of jumps; either a user or a name) ───────────────

export const jumpPartners = pgTable('jump_partners', {
  id: uuid('id').primaryKey().defaultRandom(),
  jumpId: uuid('jump_id')
    .notNull()
    .references(() => jumps.id, { onDelete: 'cascade' }),
  partnerUserId: uuid('partner_user_id')
    .references(() => users.id, { onDelete: 'set null' }),
  partnerName: text('partner_name'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull().defaultNow(),
}, (table) => ({
  atLeastOne: check(
    'jump_partners_identity_check',
    sql`${table.partnerUserId} IS NOT NULL OR ${table.partnerName} IS NOT NULL`,
  ),
}))

// ─── jump_photos (child of jumps; bytes live in R2) ────────────────────────

export const jumpPhotos = pgTable('jump_photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  jumpId: uuid('jump_id')
    .notNull()
    .references(() => jumps.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  r2Key: text('r2_key').notNull().unique(),
  kind: photoKind('kind').notNull(),
  contentType: text('content_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull().defaultNow(),
})

// ─── relations ─────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  jumps: many(jumps),
  equipment: many(equipment),
  tags: many(tags),
}))

export const dropZonesRelations = relations(dropZones, ({ many }) => ({
  jumps: many(jumps),
}))

export const jumpsRelations = relations(jumps, ({ one, many }) => ({
  user: one(users, {
    fields: [jumps.userId], references: [users.id],
  }),
  dropZone: one(dropZones, {
    fields: [jumps.dropZoneId], references: [dropZones.id],
  }),
  tags: many(jumpTags),
  equipment: many(jumpEquipment),
  partners: many(jumpPartners),
  photos: many(jumpPhotos),
}))

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, {
    fields: [tags.userId], references: [users.id],
  }),
  jumps: many(jumpTags),
}))

export const equipmentRelations = relations(equipment, ({ one, many }) => ({
  user: one(users, {
    fields: [equipment.userId], references: [users.id],
  }),
  jumps: many(jumpEquipment),
}))

export const jumpTagsRelations = relations(jumpTags, ({ one }) => ({
  jump: one(jumps, {
    fields: [jumpTags.jumpId], references: [jumps.id],
  }),
  tag: one(tags, {
    fields: [jumpTags.tagId], references: [tags.id],
  }),
}))

export const jumpEquipmentRelations = relations(jumpEquipment, ({ one }) => ({
  jump: one(jumps, {
    fields: [jumpEquipment.jumpId], references: [jumps.id],
  }),
  equipment: one(equipment, {
    fields: [jumpEquipment.equipmentId], references: [equipment.id],
  }),
}))

export const jumpPartnersRelations = relations(jumpPartners, ({ one }) => ({
  jump: one(jumps, {
    fields: [jumpPartners.jumpId], references: [jumps.id],
  }),
  partner: one(users, {
    fields: [jumpPartners.partnerUserId], references: [users.id],
  }),
}))

export const jumpPhotosRelations = relations(jumpPhotos, ({ one }) => ({
  jump: one(jumps, {
    fields: [jumpPhotos.jumpId], references: [jumps.id],
  }),
  user: one(users, {
    fields: [jumpPhotos.userId], references: [users.id],
  }),
}))
