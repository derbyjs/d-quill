var Quill = require('quill');
var Range = Quill.require('range');
var dom = Quill.require('dom');

var LINE_FORMATS = {
  'align': true
};
var BINARY_FORMATS = {
  'bold': true
, 'italic': true
, 'strike': true
, 'underline': true
, 'link': true
};
var MIXED_FORMAT_VALUE = '*';

module.exports = DerbyQuill;
function DerbyQuill() {}

DerbyQuill.Range = Range

DerbyQuill.prototype.view = __dirname;

DerbyQuill.prototype.init = function() {
  this.quill = null;
  this.activeFormats = this.model.at('activeFormats');
  this.delta = this.model.at('delta');
  this.htmlResult = this.model.at('htmlResult');
  this.plainText = this.model.at('plainText');
  this.model.start('shouldShowPlaceholder', 'htmlResult', function(html) {
    if (html === '<div><br></div>') return true
    return !html
  });
};

DerbyQuill.prototype.create = function() {
  var self = this;
  // TODO: remove this
  // Setup quill and initalize referneces
  var quill = this.quill = new Quill(this.editor);
  quill.addModule('toolbar', {
    container: window.document.createElement('div')
  });
  if (this.model.get('focus')) this.focus();

  // Bind Event listners
  this.model.on('all', 'delta.**', function(path, evtName, value, prev, passed) {
    // This change originated from this component so we
    // don't need to update ourselves
    if (passed && passed.source == quill.id) return;
    var delta = self.delta.getDeepCopy();
    if (delta) self.quill.setContents(delta);
  });
  quill.on('text-change', function(delta, source) {
    if (source === 'user') {
      self._updateDelta();
    }
    self.htmlResult.setDiff(quill.getHTML());
    self.plainText.setDiff(quill.getText());
    var range = quill.getSelection();
    self.updateActiveFormats(range);
  });
  quill.on('selection-change', function(range) {
    self.model.set('isFocused', !!range);
    self.updateActiveFormats(range);
  });
  // HACK: Quill should provide an event here, but we wrap the method to
  // get a hook into what's going on instead
  var prepareFormat = quill.prepareFormat;
  quill.prepareFormat = function(name, value) {
    prepareFormat.call(quill, name, value);
    self.activeFormats.set(name, value);
  };
  // HACK: Quill added an `ignoreFocus` argument to Selection.getRange
  // that defaults to false and doesn't expose a way of setting
  // it to true from Quill.getSelection(). This will be rectified
  // once the latest develop branch of Quill has been published
  quill.getSelection = function(ignoreFocus) {
    this.editor.checkUpdate();
    return this.editor.selection.getRange(ignoreFocus);
  }

  var delta = this.delta.getDeepCopy();
  if (delta) quill.setContents(delta);
};

DerbyQuill.prototype._updateDelta = function() {
  var pass = {source: this.quill.id};
  // TODO: Change to setDiffDeep once we figure out the error
  // shown here: https://lever.slack.com/files/jon/F0GH44U74/screen_shot_2015-12-13_at_3.00.37_pm.png
  this.delta.pass(pass).set(deepyCopy(this.quill.editor.doc.toDelta()));
}

DerbyQuill.prototype.clearFormatting = function() {
  this.quill.focus();
  var range = this.quill.getSelection(true);
  var formats = this.quill.editor.doc.formats
  for (type in formats) {
    // We don't use setFormat here because we want to avoid
    // focusing the editor for each format
    this.toolbar._applyFormat(type, range, false);
  }
};

DerbyQuill.prototype.toggleFormat = function(type) {
  var value = !this.activeFormats.get(type);
  this.setFormat(type, value);
};

DerbyQuill.prototype.setFormat = function(type, value, isFocused) {
  if (!isFocused) this.quill.focus();
  var self = this;
  // HACK: Selecting an option from a dropdown
  // causes some interesting focus events which
  // require us to wait until focus has properly
  // returned to the editor before actually applying
  // the format.
  window.requestAnimationFrame(function() {
    if (!isFocused) self.quill.focus();
    var range;
    // if we are in list mode and applying a list style, then
    // we force the editor to apply that style to the entire
    // contents of the editor
    if (self.model.get('mode') === 'list' && (type === 'list' || type === 'bullet')) {
      var end = self.quill.getLength() || 0;
      range = new Range(0, end);
      value = true
    } else {
      range = self.quill.getSelection(true);
    }
    self.toolbar._applyFormat(type, range, value);
    self.activeFormats.set(type, value);
  });
};

DerbyQuill.prototype.updateActiveFormats = function(range) {
  var activeFormats = {}
  if (range) {
    activeFormats = this.getActiveFormats(range);
  }
  this.activeFormats.set(activeFormats);
};

// Formats that span the entire range
DerbyQuill.prototype.getActiveFormats = function(range) {
  return this.toolbar._getActive(range)
};

DerbyQuill.prototype.focus = function() {
  var end = this.quill.getLength()
  if (end) {
    this.quill.setSelection(end, end);
    var range = this.quill.getSelection();
    this.updateActiveFormats(range);
    this.model.set('isFocused', true);
  }
}

DerbyQuill.prototype.setHTML = function(html) {
  return this.quill.setHTML(html);
}

deepyCopy = function(obj) {
  return JSON.parse(JSON.stringify(obj));
}
