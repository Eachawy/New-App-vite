# jhipsterTest

This application was generated using JHipster 9.4.0, you can find documentation and help at [https://www.jhipster.tech/documentation-archive/v9.4.0](https://www.jhipster.tech/documentation-archive/v9.4.0).

## Project Structure

## Development

The build system will install automatically the recommended version of Node and npm.

We provide a wrapper to launch npm.
You will only need to run this command when dependencies change in [package.json](package.json).

```bash
./npmw install
```

We use npm scripts and Vite as our build system.

Run the following commands in two separate terminals to create a blissful development experience where your browser
auto-refreshes when files change on your hard drive.

```bash
./npmw run backend:start
./npmw run start
```

Npm is also used to manage CSS and JavaScript dependencies used in this application. You can upgrade dependencies by
specifying a newer version in [package.json](package.json). You can also run `./npmw update` and `./npmw install` to manage dependencies.
Add the `help` flag on any command to see how you can use it. For example, `./npmw help update`.

The `./npmw run` command will list all the scripts available to run for this project.

### PWA Support

JHipster ships with PWA (Progressive Web App) support, and it's turned off by default. One of the main components of a PWA is a service worker.

The service worker initialization code is commented out by default. To enable it, uncomment the following code in `src/index.html`:

```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').then(function () {
      console.log('Service Worker Registered');
    });
  }
</script>
```

Note: [Workbox](https://developer.chrome.com/docs/workbox) powers JHipster's service worker. It dynamically generates the `service-worker.js` file.

### Managing dependencies

For example, to add [Leaflet](https://leafletjs.com/) library as a runtime dependency of your application, you would run the following command:

```bash
./npmw install --save --save-exact leaflet
```

To benefit from TypeScript type definitions from [DefinitelyTyped](https://definitelytyped.org/) repository in development, you would run the following command:

```bash
./npmw install --save-dev --save-exact @types/leaflet
```

Then you would import the JS and CSS files specified in library's installation instructions so that [Vite][] knows about them:
Note: There are still a few other things remaining to do for Leaflet that we won't detail here.

For further instructions on how to develop with JHipster, have a look at [Using JHipster in development](https://www.jhipster.tech/development/).

## Building for production

## Testing

### Client tests

Unit tests are run by Vitest. They're located near components and can be run with:

```bash
./npmw test
```

#### E2E tests

UI end-to-end tests are powered by [Cypress][]. They're located in [src/test/javascript/cypress/](src/test/javascript/cypress/)
and can be run by starting Spring Boot in one terminal (`./npmw run app:start`) and running the tests (`./npmw run e2e`) in a second one.

Before running Cypress tests, it's possible to specify user credentials by overriding the `CYPRESS_E2E_USERNAME` and `CYPRESS_E2E_PASSWORD` environment variables.

```bash
export CYPRESS_E2E_USERNAME="<your-username>"
export CYPRESS_E2E_PASSWORD="<your-password>"
```

See Cypress documentation for setting OS [environment variables](https://docs.cypress.io/app/references/environment-variables#Setting) to learn more.

#### Lighthouse audits

You can execute automated [Lighthouse audits](https://developer.chrome.com/docs/lighthouse/overview) with [cypress-audit](https://github.com/mfrachet/cypress-audit) by running `./npmw run e2e:cypress:audits`.

You should only run the audits when your application is packaged with the production profile.

The Lighthouse report is created in `target/cypress/lhreport.html`.

## References

- [JHipster Homepage and latest documentation](https://www.jhipster.tech/)
- [JHipster 9.4.0 archive](https://www.jhipster.tech/documentation-archive/v9.4.0)
- [Using JHipster in development](https://www.jhipster.tech/documentation-archive/v9.4.0/development/)
- [Using Docker and Docker-Compose](https://www.jhipster.tech/documentation-archive/v9.4.0/docker-compose)
- [Using JHipster in production](https://www.jhipster.tech/documentation-archive/v9.4.0/production/)
- [Running tests page](https://www.jhipster.tech/documentation-archive/v9.4.0/running-tests/)
- [Code quality page](https://www.jhipster.tech/documentation-archive/v9.4.0/code-quality/)
- [Setting up Continuous Integration](https://www.jhipster.tech/documentation-archive/v9.4.0/setting-up-ci/)
- [Node.js](https://nodejs.org/)
- [NPM](https://www.npmjs.com/)
- [Jest](https://jestjs.io)
- [Leaflet](https://leafletjs.com/)
- [DefinitelyTyped](https://definitelytyped.org/)
- [Cypress](https://www.cypress.io/)
