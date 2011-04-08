//
// Tests for op engine site joining and leaving logic.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
/*global define equals equal deepEqual module test ok*/
define([
    'util'
], function(util) {
    module('op engine sites', {
        teardown: function() {
            // clean up all clients
            util.all_clients = [];
        }
    });

    test('one site', 1, function() {
        var a = new util.OpEngClient(0, {symbol : 'x'});
        equals(a.eng.getSiteCount(), 1);
    });
    
    test('simple join', 2, function() {
        var a = new util.OpEngClient(0, {symbol : 'x'});
        // create but don't join b
        var b = new util.OpEngClient(1, {symbol : 'x'}, true);
        
        // b joins with state from a
        var state = a.eng.getState();
        b.eng.setState(state);
        b.state.symbol = a.state.symbol;
        a.eng.thawSite(b.eng.siteId);
        
        equals(a.eng.getSiteCount(), 2);
        equals(b.eng.getSiteCount(), 2);
    });
    
    test('simple leave', 4, function() {
        var a = new util.OpEngClient(0, {symbol : 'x'});
        var b = new util.OpEngClient(1, {symbol : 'x'});
        
        equals(a.eng.getSiteCount(), 2);
        equals(b.eng.getSiteCount(), 2);
        
        a.leave();
        
        equals(b.eng.getSiteCount(), 1);
        equals(util.all_clients[0], null);
    });
    
    test('leave then join', 2, function() {
        var a = new util.OpEngClient(0, {symbol : 'x'});
        var b = new util.OpEngClient(1, {symbol : 'x'});
        
        // make a leave
        a.leave();

        // create c in place of a
        var c = new util.OpEngClient(0, {symbol : 'x'}, true);
        
        // c joins with state from b
        var state = b.eng.getState();
        c.eng.setState(state);
        c.state.symbol = b.state.symbol;
        b.eng.thawSite(c.eng.siteId);
        
        equals(b.eng.getSiteCount(), 2);
        equals(c.eng.getSiteCount(), 2);
    });

    test('leave then two joins', 3, function() {
        var a = new util.OpEngClient(0, {symbol : 'x'});
        var b = new util.OpEngClient(1, {symbol : 'x'});
        
        // make a leave
        a.leave();

        // create c in place of a
        var c = new util.OpEngClient(0, {symbol : 'x'}, true);
        // and d with a whole new id
        var d = new util.OpEngClient(2, {symbol : 'x'}, true);
        
        // c joins with state from b
        var state = b.eng.getState();
        c.eng.setState(state);
        c.state.symbol = b.state.symbol;

        // d joins with state from b also
        var state = b.eng.getState();
        d.eng.setState(state);
        d.state.symbol = b.state.symbol;

        // server notifies c updated
        b.eng.thawSite(c.eng.siteId);
        // d gets it too because it's in the buffer while updating
        d.eng.thawSite(c.eng.siteId);
        // server notifies d updated
        b.eng.thawSite(d.eng.siteId);
        c.eng.thawSite(d.eng.siteId);
        
        equals(b.eng.getSiteCount(), 3);
        equals(c.eng.getSiteCount(), 3);
        equals(d.eng.getSiteCount(), 3);
    });
    
    test('three site late join', 6, function() {
        var a = new util.OpEngClient(0, {symbol : 'x'});
        var b = new util.OpEngClient(1, {symbol : 'x'});
        var c = new util.OpEngClient(2, {symbol : 'x'}, true);
    
        // a and b send events, not received by each other yet
        var a1 = a.local('symbol', 'A', 'update', 0);
        a.send(a1);
        var b1 = b.local('symbol', 'B', 'update', 0);
        b.send(b1);
    
        // join c and use state from b
        c.getStateFrom(b);
    
        // notify all sites of c's existence after update
        a.eng.thawSite(2);
        b.eng.thawSite(2);
    
        // c sends an event, not received yet
        var c1 = c.local('symbol', 'C', 'update', 0);
        c.send(c1);
    
        var correct = {symbol : 'A'};
        var sites = [a,b,c];
        for(var i=0, l=sites.length; i<l; i++) {
            var e = sites[i];
            e.recvAll();
            deepEqual(e.state, correct, 'client state check');
            equals(e.eng.getBufferSize(), 3, 'history buffer size check');
        }
    });
});