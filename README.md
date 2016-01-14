d-quill
=======

Derby rich text editor component based on Quill


To get you started Use
===



server.js
---
        require('derby-starter').run(__dirname);


package.json:
---

 * include in the dependencies section:


  `"dependencies": {
    "d-quill": "0.18.0",
    "derby": "^0.6.0-alpha24",
    "derby-starter": "^0.2.1"
  },`


index.html
----

`<Title:>`Quill Test

`<Head:>`

`  <link rel="stylesheet" href="//cdn.quilljs.com/latest/quill.snow.css" />`

`<Body:>`
`  <d-quill name="editor" value="{{ dquillExample.value }}"></d-quill>`



index.js
---

`var app = module.exports = require('derby').createApp('dquillExample', __filename);`

`app.loadViews(__dirname);`


`app.component(require('d-quill'));`

`app.get (/\/([^\/]*)\/?/, function (page, model){
        model.subscribe('dquillExample.value', function(){
                page.render();
        });
});`

