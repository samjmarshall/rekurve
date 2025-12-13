install:
	yarn

build: clean install
	yarn build

start: install
	yarn dev

check:
	yarn check

test_e2e:
	yarn test:e2e

# Security audit
audit:
	yarn npm audit --environment production

clean:
	rm -rf .next node_modules .yarn/cache .yarn/install-state.gz next-env.d.ts