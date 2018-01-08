// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import UserStore from 'stores/user_store.jsx';

export function trackEvent(category, event, props) {
    if (global.window && global.window.analytics) {
        const properties = Object.assign({category, type: event, user_actual_id: UserStore.getCurrentId()}, props);
        const options = {
            context: {
                ip: '0.0.0.0'
            },
            page: {
                path: '',
                referrer: '',
                search: '',
                title: '',
                url: ''
            },
            anonymousId: '00000000000000000000000000'
        };
        global.window.analytics.track('event', properties, options);
    }
}

/**
 * Takes an array of string names of performance markers and invokes
 * performance.clearMarkers on each.
 * @param   {array} names of markers to clear
 *
 */
export function clearMarks(names) {
    if (!isDevMode() || !isSupported([performance.clearMarks])) {
        return;
    }
    names.forEach((name) => performance.clearMarks(name));
}

export function mark(name) {
    if (!isDevMode() || !isSupported([performance.mark])) {
        return;
    }
    performance.mark(name);
}

/**
 * Takes the names of two markers and invokes performance.measure on
 * them. The measured duration (ms) and the string name of the measure is
 * are returned.
 *
 * @param   {string} name1 the first marker
 * @param   {string} name2 the second marker
 *
 * @returns {[number, string]} Either the measured duration (ms) and the string name
 * of the measure are returned or -1 and and empty string is returned if
 * in dev. mode or one of the marker can't be found.
 *
 */
export function measure(name1, name2) {
    const performanceMethodsUsed = [
        performance.measure,
        performance.getEntries,
        performance.getEntriesByName,
        performance.clearMeasures
    ];

    if (!isDevMode() || !isSupported(performanceMethodsUsed)) {
        return [-1, ''];
    }

    // Check for existence of entry name to avoid DOMException
    const performanceEntries = performance.getEntries();
    if (![name1, name2].every((name) => performanceEntries.find((item) => item.name === name))) {
        return [-1, ''];
    }

    const displayPrefix = '🐐 Mattermost: ';
    const measurementName = `${displayPrefix}${name1} - ${name2}`;
    performance.measure(measurementName, name1, name2);
    const lastDuration = mostRecentDurationByEntryName(measurementName);

    // Clean up the measures we created
    performance.clearMeasures(measurementName);
    return [lastDuration, measurementName];
}

export function trackLoadTime() {
    if (!isDevMode() || !isSupported([performance.timing.loadEventEnd, performance.timing.navigationStart])) {
        return;
    }

    // Must be wrapped in setTimeout because loadEventEnd property is 0
    // until onload is complete, also time added because analytics
    // code isn't loaded until a subsequent window event has fired.
    const tenSeconds = 10000;
    setTimeout(() => {
        const {loadEventEnd, navigationStart} = window.performance.timing;
        const pageLoadTime = loadEventEnd - navigationStart;
        trackEvent('performance', 'page_load', {duration: pageLoadTime});
    }, tenSeconds);
}

function mostRecentDurationByEntryName(entryName) {
    const entriesWithName = performance.getEntriesByName(entryName);
    return entriesWithName.map((item) => item.duration)[entriesWithName.length - 1];
}

function isSupported(checks) {
    for (let i = 0, len = checks.length; i < len; i++) {
        const item = checks[i];
        if (typeof item === 'undefined') {
            return false;
        }
    }
    return true;
}

function isDevMode() {
    return global.mm_config.EnableDeveloper === 'true';
}