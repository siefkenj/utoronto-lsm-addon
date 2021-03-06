# utoronto LSM Addion
`utoronto-lsm-addon` is a Greasemonkey/Tampermonkey view room booking data in a more useful way.

# Installation

In Firefox or Chrome, install [Greasemonkey](https://addons.mozilla.org/en-CA/firefox/addon/greasemonkey/) or Tampermonkey.
You can then install the script by clicking [here](https://github.com/siefkenj/utoronto-lsm-addon/raw/master/dist/react-userscripts.user.js).

To access the addon, navigate to [https://lsm.utoronto.ca/lsm_portal](https://lsm.utoronto.ca/lsm_portal) and click the `Room Viewer Addon`
in the top menubar.

# Development

## Building

To build `utoronto-lsm-addon` you must have [Node.js](https://nodejs.org/en/download/) and [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).
Then, from the `utoronto-lsm-addon` directory, run

```
cd userscript/
npm install
npm run build
```

When the build script completes, you should have a fresh version of the userscript located at `dist/react-userscripts.user.js`
(in the top-level `dist/` directory). (Ignore the message provided on the console about serving the project; that message is for
developing a normal web application, not a userscript addon.)

## Development and Dynamic Loading

When developing, it's nice to be able to get the newest version of your script upon a page
refresh. To do this, install the development version of `react-userscripts` script located
`dist/react-userscripts-dev.user.js` or click [here](https://github.com/siefkenj/utoronto-lsm-addon/raw/master/dist/react-userscripts-dev.user.js).
The dev script will dynamically load the extension from port `8124`, so you can take advantage of
`create-react-app`'s ability to auto-recompile an app when the source changes.

Now, run

```
cd userscript/
npm install    # if you haven't already
npm start
```

and a development server should start running on `localhost:8124`. Changing any files in `userscript/src` will trigger
and automatic recompile which will be served to the dev addon on the next page reload.
