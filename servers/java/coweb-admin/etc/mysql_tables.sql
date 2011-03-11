SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";

CREATE TABLE IF NOT EXISTS `applications` (
  `appid` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(128) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `appurl` varchar(512) NOT NULL,
  `thumbnailurl` varchar(512) DEFAULT NULL,
  PRIMARY KEY (`appid`),
  UNIQUE KEY `title` (`title`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=9 ;

CREATE TABLE IF NOT EXISTS `applicationacls` (
  `appid` bigint(20) unsigned NOT NULL,
  `username` varchar(64) NOT NULL,
  `acls` smallint(5) unsigned DEFAULT '0',
  PRIMARY KEY (`appid`,`username`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `sessions` (
  `sessionid` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `appid` bigint(20) unsigned NOT NULL,
  `title` varchar(128) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `schedule` varchar(128) DEFAULT NULL,
  `creator` varchar(64) NOT NULL,
  `createdon` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updatedon` datetime DEFAULT NULL,
  `temporary` tinyint(3) unsigned DEFAULT '0',
  `allprivacy` smallint(5) unsigned DEFAULT '0',
  PRIMARY KEY (`sessionid`),
  UNIQUE KEY `title` (`title`),
  KEY `appid` (`appid`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=23 ;

CREATE TABLE IF NOT EXISTS `sessionstore` (
  `sessionid` bigint(20) unsigned NOT NULL,
  `owner` varchar(64) NOT NULL,
  `datakey` varchar(128) NOT NULL,
  `datatype` varchar(128) NOT NULL,
  `datavalue` varchar(4096) DEFAULT NULL,
  `createdon` datetime DEFAULT NULL,
  `updatedon` datetime DEFAULT NULL,
  `acls` smallint(5) unsigned DEFAULT '0',
  PRIMARY KEY (`sessionid`,`datakey`,`datatype`,`owner`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


CREATE TABLE IF NOT EXISTS `sessionacls` (
  `sessionid` bigint(20) unsigned NOT NULL,
  `username` varchar(64) NOT NULL,
  `acls` smallint(5) unsigned DEFAULT '0',
  PRIMARY KEY (`sessionid`,`username`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


CREATE TABLE IF NOT EXISTS `sessionschedules` (
  `dateid` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sessionid` bigint(20) unsigned NOT NULL,
  `datetime` datetime NOT NULL,
  PRIMARY KEY (`dateid`),
  KEY `sessionid` (`sessionid`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `sessionfavorites` (
  `sessionid` bigint(20) unsigned NOT NULL,
  `username` varchar(64) NOT NULL,
  `favorite` tinyint(3) unsigned DEFAULT '1',
  PRIMARY KEY (`sessionid`,`username`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `botacls` (
  `botid` varchar(64) NOT NULL,
  `acls` smallint(5) unsigned DEFAULT '0',
  PRIMARY KEY (`botid`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


CREATE TABLE IF NOT EXISTS `applicationbots` (
  `botid` varchar(64) NOT NULL,
  `appid` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`botid`,`appid`),
  KEY `appid` (`appid`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `adminacls` (
  `username` varchar(64) NOT NULL,
  `acls` smallint(5) unsigned DEFAULT '0',
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `sessionactivity` (
  `sessionid` bigint(20) unsigned NOT NULL,
  `username` varchar(64) NOT NULL,
  `joinedon` datetime DEFAULT NULL,
  PRIMARY KEY (`sessionid`,`username`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `userdetails` (
  `username` varchar(64) NOT NULL,
  `email` varchar(128) NOT NULL,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `applicationacls`
--
ALTER TABLE `applicationacls`
  ADD CONSTRAINT `applicationacls_ibfk_1` FOREIGN KEY (`appid`) REFERENCES `applications` (`appid`) ON DELETE CASCADE;

--
-- Constraints for table `applicationbots`
--
ALTER TABLE `applicationbots`
  ADD CONSTRAINT `applicationbots_ibfk_1` FOREIGN KEY (`botid`) REFERENCES `botacls` (`botid`),
  ADD CONSTRAINT `applicationbots_ibfk_2` FOREIGN KEY (`appid`) REFERENCES `applications` (`appid`) ON DELETE CASCADE;

--
-- Constraints for table `sessionacls`
--
ALTER TABLE `sessionacls`
  ADD CONSTRAINT `sessionacls_ibfk_1` FOREIGN KEY (`sessionid`) REFERENCES `sessions` (`sessionid`) ON DELETE CASCADE;

--
-- Constraints for table `sessionactivity`
--
ALTER TABLE `sessionactivity`
  ADD CONSTRAINT `sessionactivity_ibfk_1` FOREIGN KEY (`sessionid`) REFERENCES `sessions` (`sessionid`) ON DELETE CASCADE;

--
-- Constraints for table `sessionfavorites`
--
ALTER TABLE `sessionfavorites`
  ADD CONSTRAINT `sessionfavorites_ibfk_1` FOREIGN KEY (`sessionid`) REFERENCES `sessions` (`sessionid`) ON DELETE CASCADE;

--
-- Constraints for table `sessions`
--
ALTER TABLE `sessions`
  ADD CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`appid`) REFERENCES `applications` (`appid`) ON DELETE CASCADE;

--
-- Constraints for table `sessionschedules`
--
ALTER TABLE `sessionschedules`
  ADD CONSTRAINT `sessionschedules_ibfk_1` FOREIGN KEY (`sessionid`) REFERENCES `sessions` (`sessionid`) ON DELETE CASCADE;

--
-- Constraints for table `sessionstore`
--
ALTER TABLE `sessionstore`
  ADD CONSTRAINT `sessionstore_ibfk_1` FOREIGN KEY (`sessionid`) REFERENCES `sessions` (`sessionid`) ON DELETE CASCADE;
