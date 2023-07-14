#!/usr/bin/env node
if(process.env.DEV) require('../build/niacin')
else require('../dist/niacin')