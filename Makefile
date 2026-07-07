install:
	yarn

build: clean install
	yarn build

start: install
	yarn run portless proxy start
	yarn run portless trust
	yarn dev

stop:
	yarn run portless proxy stop
	yarn run portless prune

check:
	yarn check

fix:
	yarn lint:fix
	yarn format:write

test:
	yarn test

test_coverage:
	yarn test --coverage

# Integration tests hit a real Neon branch — gated by INTEGRATION_DB so the
# default `make test` skips them. Locally: INTEGRATION_DB=1 make test_integration
# (DATABASE_URL must be set). In CI, the post-deploy `integration` job sets
# both against the resolved Preview branch.
test_integration:
	yarn test:integration

test_e2e:
	yarn test:e2e $(if $(PLAYWRIGHT_SHARD),--shard=$(PLAYWRIGHT_SHARD),)

# Security audit
audit:
	yarn npm audit --environment production

db_generate: install
	yarn db:generate

db_custom: install
	yarn db:custom --name=$(name)

db_migrate: install
	yarn db:migrate

db_studio: install
	yarn db:studio

db_branch:
	scripts/neon-branch.sh create

db_branch_delete:
	scripts/neon-branch.sh delete

db_branch_delete_all:
	scripts/neon-branch.sh delete --all

db_branch_status:
	scripts/neon-branch.sh status

hubspot_setup:
	yarn tsx scripts/hubspot/setup.ts

vercel_link:
	yarn vercel link

env_pull:
	yarn vercel env pull .env.local

env_pull_preview:
	yarn vercel pull --environment=preview --git-branch=$$(git rev-parse --abbrev-ref HEAD)

release:
	yarn release

clean:
	rm -rf .next/ next-env.d.ts tsconfig.tsbuildinfo \
		node_modules .yarn/cache .yarn/install-state.gz \
		test-results playwright-report .playwright-mcp
	yarn run portless clean

# Render every docs/adr/diagrams/*.d2 to a light `.svg` (`--theme 0`) and a dark `-dark.svg` (`--theme 200` Dark Mauve) sibling; ADR docs pick between them with a `<picture>` + prefers-color-scheme block (a single `--dark-theme` adaptive SVG can't be used — GitHub sandboxes embedded SVGs and strips the internal media query). Codegen, safe to run inline; commit all files. Recipe cd's into the diagrams dir so relative ./icons/*.svg in the .d2 files resolve. Icons are baked in as base64 and don't recolour with the theme, so mode-specific glyphs need a `-dark` variant swapped in for the dark render only: `inngest`/`vercel` get a white `-dark` icon (the light render keeps the dark original), while `drizzle` uses one brand-colour file that reads on both canvases (see docs/adr/diagrams/README.md). The `data-d2-version` attribute is normalised (leading `v` stripped) so a Homebrew d2 ("0.7.1") and the release binary CI installs ("v0.7.1") emit byte-identical SVGs.
diagrams:
	@cd docs/adr/diagrams && for f in *.d2; do [ -e "$$f" ] || continue; \
	  echo "d2 -> $${f%.d2}.svg"; d2 --layout elk --theme 0 "$$f" - | sed 's/\(data-d2-version="\)v/\1/' > "$${f%.d2}.svg"; \
	  echo "d2 -> $${f%.d2}-dark.svg"; sed -e 's#icons/inngest.svg#icons/inngest-dark.svg#' -e 's#icons/vercel.svg#icons/vercel-dark.svg#' "$$f" | d2 --layout elk --theme 200 - - | sed 's/\(data-d2-version="\)v/\1/' > "$${f%.d2}-dark.svg"; \
	done

# CI freshness gate: regenerates each diagram's light + dark SVG to a temp dir (same version normalisation as `diagrams`) and fails on a stale/missing SVG. Recipe cd's into the diagrams dir so relative ./icons/*.svg in the .d2 files resolve.
diagrams-check:
	@tmp=$$(mktemp -d); status=0; cd docs/adr/diagrams && for f in *.d2; do [ -e "$$f" ] || continue; \
	  b=$$(basename "$${f%.d2}"); \
	  d2 --layout elk --theme 0 "$$f" - | sed 's/\(data-d2-version="\)v/\1/' > "$$tmp/$$b.svg"; \
	  if ! diff -q "$$tmp/$$b.svg" "$${f%.d2}.svg" >/dev/null 2>&1; then echo "STALE or MISSING: docs/adr/diagrams/$${f%.d2}.svg - run make diagrams"; status=1; fi; \
	  sed -e 's#icons/inngest.svg#icons/inngest-dark.svg#' -e 's#icons/vercel.svg#icons/vercel-dark.svg#' "$$f" | d2 --layout elk --theme 200 - - | sed 's/\(data-d2-version="\)v/\1/' > "$$tmp/$$b-dark.svg"; \
	  if ! diff -q "$$tmp/$$b-dark.svg" "$${f%.d2}-dark.svg" >/dev/null 2>&1; then echo "STALE or MISSING: docs/adr/diagrams/$${f%.d2}-dark.svg - run make diagrams"; status=1; fi; \
	done; rm -rf "$$tmp"; exit $$status