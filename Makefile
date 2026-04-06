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

db_push: install
	yarn db:push

db_studio: install
	yarn db:studio

release:
	yarn release

clean:
	rm -rf .next/ next-env.d.ts tsconfig.tsbuildinfo \
		node_modules .yarn/cache .yarn/install-state.gz \
		test-results playwright-report .playwright-mcp