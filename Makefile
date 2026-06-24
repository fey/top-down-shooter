.PHONY: install dev build preview check format typecheck test clean update-deps

install:
	npm ci

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

check:
	npm run check

format:
	npm run format

typecheck:
	npm run typecheck

test:
	npm run test

clean:
	rm -rf dist

update-deps:
	npx ncu -u && npm install
