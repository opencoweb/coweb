define(["require","coweb/main"],function(a,b){var c=function(a){this.cowebKey=undefined,this.cowebCollab=!0,this.sess=b.initSession(),this.collab=b.initCollab({id:a}),this.collab.subscribeReady(this,"onCollabReady"),this.prepareMetadata=null},d=c.prototype;d.run=function(){this.onRun(),this.prepare()},d.onRun=function(){},d.onSessionPrepared=function(a){},d.onSessionJoined=function(){},d.onSessionUpdated=function(){},d.onSessionFailed=function(a){},d.onCollabReady=function(a){},d.prepare=function(){var a={collab:!!this.cowebCollab};this.cowebKey&&(a.key=String(this.cowebKey)),a.autoJoin=!1,a.autoUpdate=!1,this.sess.prepare(a).then("_onSessionPrepared",null,this).then("_onSessionJoined",null,this).then("_onSessionUpdated","onSessionFailed",this)},d._onSessionPrepared=function(a){this.prepareMetadata=a,this.onSessionPrepared(a);return this.sess.join()},d._onSessionJoined=function(a){this.onSessionJoined(a);return this.sess.update()},d._onSessionUpdated=function(a){this.onSessionUpdated(a)};return c})