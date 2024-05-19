import { pgTable, index, varchar, timestamp, bigserial, text, primaryKey, integer } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"



export const rekurveSession = pgTable("rekurve_session", {
	sessionToken: varchar("sessionToken", { length: 255 }).primaryKey().notNull(),
	userId: varchar("userId", { length: 255 }).notNull(),
	expires: timestamp("expires", { mode: 'string' }).notNull(),
},
(table) => {
	return {
		sessionUserIdIdx: index("session_userId_idx").on(table.userId),
	}
});

export const rekurveUser = pgTable("rekurve_user", {
	id: varchar("id", { length: 255 }).primaryKey().notNull(),
	name: varchar("name", { length: 255 }),
	email: varchar("email", { length: 255 }).notNull(),
	emailVerified: timestamp("emailVerified", { precision: 3, mode: 'string' }).default(CURRENT_TIMESTAMP(3)),
	image: varchar("image", { length: 255 }),
});

export const rekurvePost = pgTable("rekurve_post", {
	id: bigserial("id", { mode: "bigint" }).primaryKey().notNull(),
	name: varchar("name", { length: 256 }),
	createdById: varchar("createdById", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		createdByIdIdx: index("createdById_idx").on(table.createdById),
		nameIdx: index("name_idx").on(table.name),
	}
});

export const rekurveWaitlist = pgTable("rekurve_waitlist", {
	email: varchar("email", { length: 256 }).primaryKey().notNull(),
	name: varchar("name", { length: 256 }),
	company: varchar("company", { length: 256 }),
	problems: text("problems"),
	solutions: text("solutions"),
});

export const rekurveVerificationToken = pgTable("rekurve_verificationToken", {
	identifier: varchar("identifier", { length: 255 }).notNull(),
	token: varchar("token", { length: 255 }).notNull(),
	expires: timestamp("expires", { mode: 'string' }).notNull(),
},
(table) => {
	return {
		rekurveVerificationTokenIdentifierTokenPk: primaryKey({ columns: [table.identifier, table.token], name: "rekurve_verificationToken_identifier_token_pk"})
	}
});

export const rekurveAccount = pgTable("rekurve_account", {
	userId: varchar("userId", { length: 255 }).notNull(),
	type: varchar("type", { length: 255 }).notNull(),
	provider: varchar("provider", { length: 255 }).notNull(),
	providerAccountId: varchar("providerAccountId", { length: 255 }).notNull(),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	expiresAt: integer("expires_at"),
	tokenType: varchar("token_type", { length: 255 }),
	scope: varchar("scope", { length: 255 }),
	idToken: text("id_token"),
	sessionState: varchar("session_state", { length: 255 }),
},
(table) => {
	return {
		accountsUserIdIdx: index("accounts_userId_idx").on(table.userId),
		rekurveAccountProviderProviderAccountIdPk: primaryKey({ columns: [table.provider, table.providerAccountId], name: "rekurve_account_provider_providerAccountId_pk"})
	}
});