/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb;

import java.util.List;

public interface UpdaterTypeMatcher {
    /**
     * Called when a Delegate implementation needs to match an Updater Type.
     *
     * @param updaterType String type of updater of the updatee.
     * @param availableUpdaterTypes List<String> list of available updater types.
     * @return String return matched type otherwise null to indicate no match is available
     */
	String match(String updaterType, List<String> availableUpdaterTypes);
}
