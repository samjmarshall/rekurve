
install:
	yarn

start: install
	yarn dev

lint:
	yarn lint

build:
	yarn build

clean:
	rm -rf node_modules/
	rm -rf .next/