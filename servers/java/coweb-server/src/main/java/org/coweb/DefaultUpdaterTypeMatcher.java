/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb;

import java.util.List;

public class DefaultUpdaterTypeMatcher implements UpdaterTypeMatcher {

	public String match(String updaterType, List<String> availableUpdaterTypes) {
		String matchedType = null;
		for (String availableUpdaterType : availableUpdaterTypes) {
			if (availableUpdaterType.equals(updaterType)) {
				matchedType = availableUpdaterType;
				break;
			}
		}
		return matchedType;
	}
}
