# Dependencies
`npm i reflect-metadata`
`npm i typescript ts-node @types/node @types/reflect-metadata nodemon rimraf --save-dev`
`npm install prettier tslint tslint-config-prettier --save-dev`

# Scripts

```
    "tsc": "rimraf dist/ && tsc --project tsconfig.production.json",
    "format": "prettier --write \"src/**/*.ts\"",
    "lint": "tslint -p tsconfig.json"
```

# Files 
Add this to `package.json`
```
  "files": [
    "dist/**/*"
  ],
```

# Build
Add this to `compilerOptions` in `tsconfig.json`
`"declaration": true`