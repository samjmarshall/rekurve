
install:
	yarn

start: install
	yarn dev

lint:
	yarn lint

build: clean install
	yarn build

build-start: build
	yarn start

analyze: clean install
	ANALYZE=true yarn build

clean:
	rm -rf node_modules/
	rm -rf .next/