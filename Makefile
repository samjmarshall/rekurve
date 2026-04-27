install:
	yarn

build: clean install
	yarn build

start: install
	yarn dev

check:
	yarn check

fix:
	yarn lint:fix
	yarn format:write

test:
	yarn test

test_coverage:
	yarn test --coverage

test_e2e:
	yarn test:e2e

# Security audit
audit:
	yarn npm audit --environment production

db_generate: install
	yarn db:generate

db_migrate: install
	yarn db:migrate

db_studio: install
	yarn db:studio

db_branch:
	scripts/neon-branch.sh create

db_branch_delete:
	scripts/neon-branch.sh delete

db_branch_delete_all:
	scripts/neon-branch.sh delete --all

db_branch_status:
	scripts/neon-branch.sh status

hubspot_setup:
	yarn tsx scripts/hubspot/setup.ts

vercel_link:
	yarn vercel link

env_pull:
	yarn vercel env pull .env.local

env_pull_preview:
	yarn vercel pull --environment=preview --git-branch=$$(git rev-parse --abbrev-ref HEAD)

release:
	yarn release

clean:
	rm -rf .next/ next-env.d.ts tsconfig.tsbuildinfo \
		node_modules .yarn/cache .yarn/install-state.gz \
		test-results playwright-report .playwright-mcp