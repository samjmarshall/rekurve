
install:
	yarn

start: install
	yarn dev

clean:
	rm -rf node_modules/
	rm -rf .next/