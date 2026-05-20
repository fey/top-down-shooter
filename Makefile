.PHONY: install dev build preview check format typecheck clean

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

clean:
	rm -rf dist
