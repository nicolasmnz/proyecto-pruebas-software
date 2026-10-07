.PHONY: dev-web dev-api

dev-web:
	npm run dev -w apps/web

dev-api:
	npm run dev -w apps/api