CREATE TABLE applications (
    appid		INTEGER GENERATED ALWAYS AS IDENTITY,
    title	    VARCHAR(512) UNIQUE NOT NULL,
    description	VARCHAR(512) DEFAULT NULL,
    appurl      VARCHAR(512) NOT NULL,
    thumbnailurl VARCHAR(512) DEFAULT NULL,
    PRIMARY KEY(appid)
);
CREATE TABLE applicationacls (
    appid       INTEGER NOT NULL REFERENCES applications (appid) ON DELETE CASCADE,
    username    VARCHAR(512) NOT NULL,
    acls        INTEGER DEFAULT 0,
    PRIMARY KEY (appid, username)
);
CREATE TABLE sessions (
    sessionid   INTEGER GENERATED ALWAYS AS IDENTITY,
    appid       INTEGER NOT NULL REFERENCES applications (appid) ON DELETE CASCADE,
    title	    VARCHAR(512) UNIQUE NOT NULL,
    description	VARCHAR(512) DEFAULT NULL,
    datetime    VARCHAR(512) DEFAULT NULL,
    creator     VARCHAR(512) NOT NULL,
    createdon   TIMESTAMP,
    updatedon   TIMESTAMP,
    temp_session   INTEGER DEFAULT 0,
    allprivacy  INTEGER DEFAULT 0,
    PRIMARY KEY(sessionid)
);
CREATE TABLE sessionstore (
    sessionid   INTEGER NOT NULL REFERENCES sessions (sessionid) ON DELETE CASCADE,
    owner       VARCHAR(512) NOT NULL,
    datakey     VARCHAR(512) NOT NULL,
    datatype    VARCHAR(512) NOT NULL,
    datavalue   VARCHAR(4096) DEFAULT NULL,
    createdon   TIMESTAMP,
    updatedon   TIMESTAMP,
    acls        INTEGER DEFAULT 0,
    PRIMARY KEY (sessionid, datakey, datatype, owner)
);
CREATE TABLE sessionacls (
    sessionid   INTEGER NOT NULL REFERENCES sessions (sessionid) ON DELETE CASCADE,
    username    VARCHAR(512) NOT NULL,
    acls        INTEGER DEFAULT 0,
    PRIMARY KEY (sessionid, username)
);
CREATE TABLE sessionschedules (
    dateid      INTEGER PRIMARY KEY,
    sessionid   INTEGER NOT NULL REFERENCES sessions (sessionid) ON DELETE CASCADE,
    datetime    TIMESTAMP NOT NULL
);
CREATE TABLE sessionfavorites (
    sessionid   INTEGER NOT NULL REFERENCES sessions (sessionid) ON DELETE CASCADE,
    username    VARCHAR(512) NOT NULL,
    favorite    INTEGER DEFAULT 1,
    PRIMARY KEY (sessionid, username)
);
CREATE TABLE botacls (
    botid		VARCHAR(512) NOT NULL PRIMARY KEY,
    acls        INTEGER DEFAULT 0
);
CREATE TABLE applicationbots (
    botid       VARCHAR(512) NOT NULL REFERENCES botacls (botid) ON DELETE CASCADE,
    appid       INTEGER NOT NULL REFERENCES applications (appid) ON DELETE CASCADE,
    PRIMARY KEY (botid, appid)
);
CREATE TABLE adminacls (
    username    VARCHAR(512) NOT NULL PRIMARY KEY,
    acls        INTEGER DEFAULT 0
);
CREATE TABLE sessionactivity (
  sessionid INTEGER NOT NULL REFERENCES sessions (sessionid) ON DELETE CASCADE,
  username  VARCHAR(512) NOT NULL,
  joinedon  TIMESTAMP DEFAULT NULL,
  PRIMARY KEY (sessionid,username)
);
CREATE TABLE userdetails (
  username VARCHAR(512) NOT NULL,
  email    VARCHAR(512) NOT NULL,
  PRIMARY KEY (username)
);



