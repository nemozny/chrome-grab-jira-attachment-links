# Introduction

As of 2024/1 the new Jira Cloud attachment manager does not allow you to grab a link to an existing Jira attachment. There is currently an [open Atlassian ticket](https://jira.atlassian.com/browse/JRACLOUD-64906) to enable direct links to attachments.

This Chrome plugin is a workaround for the missing Jira Cloud functionality.

This plugin grabs the Jira URL and issue key from your active Chrome tab, queries the Jira REST API for attachments and displays the list with direct links to individual files.
Additionally there is a button to copy the link to your clipboard.

See this screenshot:

![runtime_screenshot](images/screenshot-2.png)

The plugin runs only on websites with "atlassian" in the URL.

## Enable the plugin

1. Clone or download the plugin to a local folder.
2. Go to Chrome - Extensions > Manage Extensions
3. Enable the Chrome Developer mode in the top right corner.
4. "Load unpacked" button will show up in the top left corner.
5. Click the button and load the folder where you have downloaded the plugin.

## How to use the plugin
1. Click the Extensions plugin
2. Click the pin button next to this plugin
3. Click the plugin icon to print the list of attachments

![config_screenshot](images/screenshot-1.png)

## TODO
I don't know if this plugin is any useful, but if there is an interest, I can register the plugin to the Chrome Web Store.

## Credits
