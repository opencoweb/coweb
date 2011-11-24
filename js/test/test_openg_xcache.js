//
// Tests for op engine transformed op most recent context vector (MCRV) caching
// for O(N) vs O(N^3) scaling with sites.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
/*global define equals equal deepEqual module test ok*/
define([
    'util'
], function(util) {
    module('op engine xcache', {
        teardown: function() {
            // clean up all clients
            util.all_clients = [];
        }
    });

    test('two site insert lag', 4, function() {
        var a = new util.OpEngClient(0, {symbol : '1 2'});
        var b = new util.OpEngClient(1, {symbol : '1 2'});
    
        var aStr = 'abcdefghijklm';
        var bStr = 'nopqrstuvwxyz';
        var op;
        // lots of typing on a after the "1"
        for(var i=0, pos=1; i < aStr.length; i++, pos++) {
            op = a.local('symbol', aStr[i], 'insert', pos);
            a.send(op);
        }
    
        // lots of typing on b after the "2"
        for(i=0, pos=3; i < bStr.length; i++, pos++) {
            op = b.local('symbol', bStr[i], 'insert', pos);
            b.send(op);
        }

        a.recvAll();
        b.recvAll();
    
        var correct = {symbol : '1'+aStr+' 2'+bStr};
        deepEqual(a.state, correct, 'client state check');
        equals(a.eng.getBufferSize(), aStr.length+bStr.length);
        deepEqual(b.state, correct, 'client state check');
        equals(b.eng.getBufferSize(), aStr.length+bStr.length); 
    });
    
    test('three site insert lag', 6, function() {
        var init = '1 2 3';
        var sites = [
            new util.OpEngClient(0, {symbol : init}),
            new util.OpEngClient(1, {symbol : init}),
            new util.OpEngClient(2, {symbol : init})
        ];
        var strs = ['abcdefghi', 'jklmnopqr', 'stuvwxyz'];
        var op, i, pos, offset = 1, s, str, site;
        
        for(s=0; s < strs.length; s++) {
            str = strs[s];
            site = sites[s];
            for(i=0, pos=offset; i < str.length; i++, pos++) {
                op = site.local('symbol', str[i], 'insert', pos);
                site.send(op);
            }
            offset += 2;
        }
    
        var correct = {symbol : '1'+strs[0]+' 2'+strs[1]+' 3'+strs[2]};
        for(i=0; i < sites.length; i++) {
            site = sites[i];
            site.recvAll();
            deepEqual(site.state, correct, 'client state check');
            equals(site.eng.getBufferSize(), 26);
        };
    });

    test('two site delete lag', 4, function() {
        var init = '1abcdefghijklm 2nopqrstuvwxyz';
        var sites = [
            new util.OpEngClient(0, {symbol : init}),
            new util.OpEngClient(1, {symbol : init})
        ];
        var strs = ['abcdefghijklm', 'nopqrstuvwxyz'];
        var op, i, pos, offset = 1, s, str, site;
        
        for(s=0; s < strs.length; s++) {
            str = strs[s];
            site = sites[s];
            for(i=0, pos=offset; i < str.length; i++) {
                op = site.local('symbol', null, 'delete', pos);
                site.send(op);
            }
            offset += str.length+2;
        }
    
        var correct = {symbol : '1 2'};
        for(i=0; i < sites.length; i++) {
            site = sites[i];
            site.recvAll();
            deepEqual(site.state, correct, 'client state check');
            equals(site.eng.getBufferSize(), 26);
        };
    });

    test('three site delete lag', 6, function() {
        var init = '1abcdefghi 2jklmnopqr 3stuvwxyz';
        var sites = [
            new util.OpEngClient(0, {symbol : init}),
            new util.OpEngClient(1, {symbol : init}),
            new util.OpEngClient(2, {symbol : init})
        ];
        var strs = ['abcdefghi', 'jklmnopqr', 'stuvwxyz'];
        var op, i, pos, offset = 1, s, str, site;
        
        for(s=0; s < strs.length; s++) {
            str = strs[s];
            site = sites[s];
            for(i=0, pos=offset; i < str.length; i++) {
                op = site.local('symbol', null, 'delete', pos);
                site.send(op);
            }
            offset += str.length+2;
        }
    
        var correct = {symbol : '1 2 3'};
        for(i=0; i < sites.length; i++) {
            site = sites[i];
            site.recvAll();
            deepEqual(site.state, correct, 'client state check');
            equals(site.eng.getBufferSize(), 26);
        };
    });
    
    test('two site insert/delete lag', 4, function() {
        var init = '1nopqrstuvwxyz 2abcdefghijklm';
        var sites = [
            new util.OpEngClient(0, {symbol : init}),
            new util.OpEngClient(1, {symbol : init})
        ];
        var strs = ['abcdefghijklm', 'nopqrstuvwxyz'];
        var op, i, pos, offset = 1, s, str, site;
        
        for(s=0; s < strs.length; s++) {
            str = strs[s];
            site = sites[s];
            for(i=0, pos=offset; i < str.length; i++, pos++) {
                op = site.local('symbol', null, 'delete', pos);
                site.send(op);
                op = site.local('symbol', str[i], 'insert', pos);
                site.send(op);
            }
            offset += str.length+2;
        }
    
        var correct = {symbol : '1' + strs[0] + ' 2' + strs[1]};
        for(i=0; i < sites.length; i++) {
            site = sites[i];
            site.recvAll();
            deepEqual(site.state, correct, 'client state check');
            equals(site.eng.getBufferSize(), 52);
        };
    });

    test('three site insert/delete lag', 6, function() {
        var init = '1nopqrstuvwxyz 2abcdefghijklm 3zyxwvutsrqpon';
        var sites = [
            new util.OpEngClient(0, {symbol : init}),
            new util.OpEngClient(1, {symbol : init}),
            new util.OpEngClient(2, {symbol : init})
        ];
        var strs = ['abcdefghijklm', 'nopqrstuvwxyz', 'mlkjihgfedcba'];
        var op, i, pos, offset = 1, s, str, site;
        
        for(s=0; s < strs.length; s++) {
            str = strs[s];
            site = sites[s];
            for(i=0, pos=offset; i < str.length; i++, pos++) {
                op = site.local('symbol', null, 'delete', pos);
                site.send(op);
                op = site.local('symbol', str[i], 'insert', pos);
                site.send(op);
            }
            offset += str.length+2;
        }

        var correct = {symbol : '1' + strs[0] + ' 2' + strs[1] + ' 3' + strs[2]};
        for(i=0; i < sites.length; i++) {
            site = sites[i];
            site.recvAll();
            deepEqual(site.state, correct, 'client state check');
            equals(site.eng.getBufferSize(), 78);
        };
    });
});