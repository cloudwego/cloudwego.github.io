## Improvement

* Fix: reduce costs of SetNumLoops
* Chore: update mcache and ci
* Feat: recycle caches when LinkBuffer is closed

## Fix

* Fix: send&close ignored by OnRequest
* Fix: fill lost some data when read io.EOF
* Fix: check is active when flush

## Doc

* Doc: update guide.md
* Doc: restate the definition of Reader.Slice
* Doc: fix replace examples url

## Revert

* Revert "feat: change default number of loops policy (#31)"

