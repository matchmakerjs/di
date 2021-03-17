## Create .npmrc file at the project root

### Update .npmrc to contain the following
`@olaleyeone:registry=https://npm.pkg.github.com/`

## Set package content

### Update package.json to contain a files property that points to the package content
`
    "files": [
        "dist/**/*"
    ],
`

## Login to github mpm

$ npm login --scope=@OWNER --registry=https://npm.pkg.github.com

> Username: USERNAME
> Password: TOKEN
> Email: PUBLIC-EMAIL-ADDRESS