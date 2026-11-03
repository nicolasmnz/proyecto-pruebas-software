.PHONY: dev-web dev-api jenkins-up jenkins-down jenkins-logs jenkins-status jenkins-verify

dev-web:
	npm run dev -w apps/web

dev-api:
	npm run dev -w apps/api

jenkins-up:
	bash scripts/jenkins.sh up

jenkins-down:
	bash scripts/jenkins.sh down

jenkins-logs:
	bash scripts/jenkins.sh logs

jenkins-status:
	bash scripts/jenkins.sh status

jenkins-verify:
	python3 scripts/jenkins-verify.py
