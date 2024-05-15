
install:
	yarn

start: clean install
	yarn dev

lint:
	yarn lint

build: clean install
	yarn build

clean:
	rm -rf node_modules/
	rm -rf .next/