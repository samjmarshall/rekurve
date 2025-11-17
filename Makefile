install:
	yarn

build: clean install
	yarn build

start: install
	yarn dev

check:
	yarn check

clean:
	rm -rf .next node_modules .yarn/cache .yarn/install-state.gz next-env.d.ts