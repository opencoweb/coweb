//
// Chat widget.
//
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('comap.ChatBox');
dojo.require('dijit._Widget');
dojo.require('dijit._Templated');
dojo.require('dijit._Contained');
dojo.require('dojo.date.locale');
dojo.require('dojo.date.stamp');
dojo.requireLocalization('comap', 'ChatBox');

dojo.declare('comap.ChatBox', [dijit._Widget, dijit._Templated, dijit._Contained], {
    // application controller
    app: null,
    // allow user entry?
    allowEntry: true,
    // widget template
    templatePath: dojo.moduleUrl('comap.templates', 'ChatBox.html'),
    postMixInProperties: function() {
        this._labels = dojo.i18n.getLocalization('comap', 'ChatBox');
        // regex for links
        this._linkRex = /\s(https?:\/\/\S+)|^(https?:\/\/\S+)/g;
    },

    postCreate: function() {
        if(!this.allowEntry) {
            dojo.style(this.entryContainerNode, 'display', 'none');
            dojo.style(this.historyNode, 'bottom', '0px');
        }
        // watch for first focus on chat to hide the prompt message
        var tok = dojo.connect(this.entryNode, 'onfocus', function(event) {
            event.target.style.color = '';
            event.target.value = '';
            dojo.disconnect(tok);
        });
    },
    
    sanitizeText: function(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    },
    
    parseLinks: function(text) {
        return text.replace(this._linkRex, ' <a href="$1$2" target="_blank">$1$2</a>');
    },
    
    onMessage: function(text, pos, isoDT) {
        // extension point
    },

    _onKeyDown: function(event) {
        if(event.keyCode == dojo.keys.ENTER) {
            // don't send blanks
            if(!this.entryNode.value) return;
            // sanitize the entered text
            var text = this.sanitizeText(this.entryNode.value)
            // find and make http links
            text = this.parseLinks(text);
            // build iso datetime string
            var now = new Date();
            var isoDT = dojo.date.stamp.toISOString(now, {zulu: true});
            // insert the message in the history
            var pos = this.insertMessage(this.app.username, text, isoDT);
            // invoke extension point
            this.onMessage(this.entryNode.value, pos, isoDT)
            // clear the entry box
            this.entryNode.value = '';
        }
    },

    insertMessage: function(username, text, isoDT, pos) {
        if(pos === undefined) {
            var pos = dojo.query('div.wChatBoxMessage', this.historyNode).length;
        }
        var msg = dojo.create('div', {className : 'wChatBoxMessage'}, 
            this.historyNode, pos);
        var meta = dojo.create('div', {className : 'wChatBoxMessageMeta'}, msg);
        // include username
        if(username) {
            dojo.create('span', {
                className : 'wChatBoxMessageUsername',
                innerHTML : this.sanitizeText(username)
            }, meta);
        }

        // build or use the date
        var date;
        if(!isoDT) {
            date = new Date();
            isoDT = dojo.date.stamp.toISOString(date);
        } else {
            date = dojo.date.stamp.fromISOString(isoDT);
        }
        var localTime = dojo.date.locale.format(date,
            {timePattern: 'HH:mm', selector: 'time'});
        dojo.create('span', {
            className : 'wChatBoxMessageTime',
            innerHTML : '@'+localTime,
            title: isoDT
        }, meta);

        // include message text
        dojo.create('span', {
            className : 'wChatBoxMessageText',
            innerHTML : text
        }, msg);
        // scroll to latest message
        msg.scrollIntoView(false);

        return {pos : pos, isoDT : isoDT};
    },
    
    setHtml: function(html) {
        // @todo: replace to accept raw chat log for processing to avoid
        //   poisoned state attacks
        this.historyNode.innerHTML = html;
        // adjust timestamps for new locale
        dojo.query('.wChatBoxMessageTime', this.historyNode)
        .forEach(function(item) {
            var date = dojo.date.stamp.fromISOString(item.title);
            var localTime = dojo.date.locale.format(date,
                {timePattern: 'HH:mm', selector: 'time'});
            item.innerHTML = '@123'+localTime;
        });
    },
    
    getHtml: function() {
        // @todo: replace to return raw chat log for processing to avoid
        //   poisoned state attacks
        return this.historyNode.innerHTML;
    }
});