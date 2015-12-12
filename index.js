var Quill = require('quill');
var Range = Quill.require('range');

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
DerbyQuill.prototype.view = __dirname;

DerbyQuill.prototype.init = function() {
  this.quill = null;
  this.activeFormats = this.model.at('activeFormats');
  this.delta = this.model.at('delta');
  this.htmlResult = this.model.at('htmlResult');
  this.plainText = this.model.at('plainText');
};

DerbyQuill.prototype.create = function() {
  // TODO: remove this
  window.Quill = Quill
  var quill = this.quill = new Quill(this.editor);
  quill.addModule('toolbar', {
    container: window.document.createElement('div')
  });
  window.toolbar = this.toolbar = quill.modules['toolbar']
  var self = this;

  this.model.on('change', 'delta.**', function(path, value, prev, passed) {
    // This change originated from this component so we
    // don't need to update ourselves
    if (passed && passed.source == quill.id) return;
    var delta = self.delta.getDeepCopy();
    if (delta) self.quill.setContents(delta);
  });

  quill.on('text-change', function() {
    self.delta.pass({source: quill.id}).setDiffDeep(quill.editor.doc.toDelta())
    self.htmlResult.set(quill.getHTML());
    self.plainText.set(quill.getText());
    var range = quill.getSelection();
    self.updateActiveFormats(range);
  });
  quill.on('selection-change', function(range) {
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
};

DerbyQuill.prototype.clearFormatting = function() {
  this.quill.focus();
  var range = this.quill.getSelection(true);
  var formats = this.getContainedFormats(range);
  for (type in formats) {
    this.setFormat(type, false);
  }
};

DerbyQuill.prototype.toggleFormat = function(type) {
  var value = !this.activeFormats.get(type);
  this.setFormat(type, value);
};

DerbyQuill.prototype.setFormat = function(type, value) {
  this.quill.focus();
  var range = this.quill.getSelection(true);
  this.toolbar._applyFormat(type, range, value);
  this.delta.pass({source: this.quill.id}).set(this.quill.editor.doc.toDelta());
};

DerbyQuill.prototype.updateActiveFormats = function(range) {
  var activeFormats = {}
  if (range) {
    activeFormats = this.getActiveFormats(range);
  }
  this.activeFormats.set(activeFormats);
};

// Formats that are contained within part of the range
DerbyQuill.prototype.getContainedFormats = function(range) {
  return this._getFormats(range, addContainedFormats);
};

// Formats that span the entire range
DerbyQuill.prototype.getActiveFormats = function(range) {
  return this.toolbar._getActive(range)
};

DerbyQuill.prototype._getFormats = function(range, addFn) {
  var formats = {};
  var ops = this.getRangeContents(range).ops;
  var lines = this.getRangeLines(range);
  addFn(formats, ops, 'attributes');
  addFn(formats, lines, 'formats');
  return formats;
};

function addContainedFormats(formats, items, key) {
  for (var i = 0; i < items.length; i++) {
    var itemFormats = items[i][key];
    for (var type in itemFormats) {
      formats[type] = true;
    }
  }
}

DerbyQuill.prototype.getRangeContents = function(range) {
  if (!range) return
  if (range.isCollapsed()) {
    var start = Math.max(0, range.start - 1);
    return this.quill.getContents(start, range.end);
  }
  return this.quill.getContents(range);
};

DerbyQuill.prototype.getRangeLines = function(range) {
  var line = this.quill.editor.doc.findLineAt(range.start)[0];
  var lastLine = this.quill.editor.doc.findLineAt(range.end)[0];
  var lines = [];
  while (line) {
    lines.push(line);
    if (line === lastLine) break;
    line = line.next;
  }
  return lines;
};

DerbyQuill.prototype.createRange = function(start, end) {
  return new Range(start, end);
};
