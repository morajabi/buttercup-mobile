import { Alert, Clipboard, Linking } from "react-native";
import { connect } from "react-redux";
import EntryPage from "../components/EntryPage.js";
import { handleError } from "../global/exceptions.js";
import {
    setEntryEditing,
    setFacadeValue,
    setNotification
} from "../actions/entry.js"
import { navigateBack, navigateToNewMeta } from "../actions/navigation.js";
import { setSaving } from "../actions/app.js";
import {
    getEntryFields,
    getEntryID,
    getEntryMeta,
    getEntryPassword,
    getEntryProperties,
    getEntryTitle,
    getEntryURL,
    getNotification,
    getSourceID,
    isEditing
} from "../selectors/entry.js";
import {
    isSaving
} from "../selectors/app.js";
import { getEntry, loadEntry } from "../shared/entry.js";
import { consumeEntryFacade, createEntryFacade } from "../library/buttercup.js";
import { saveCurrentArchive } from "../shared/archive.js";
import { updateCurrentArchive } from "../shared/archiveContents.js";
import { promptDeleteEntry } from "../shared/entry.js";

export default connect(
    (state, ownProps) => ({
        editing:                    isEditing(state),
        entryNotificationMessage:   getNotification(state),
        meta:                       getEntryMeta(state),
        properties:                 getEntryProperties(state),
        saving:                     isSaving(state),
        title:                      getEntryTitle(state)
    }),
    {
        copyToClipboard:            (name, value) => dispatch => {
            Clipboard.setString(value);
            dispatch(setNotification(`Copied '${name}' to clipboard...`));
            setTimeout(() => {
                // clear notification
                dispatch(setNotification(""));
            }, 1250);
        },
        onAddMeta:                  () => dispatch => {
            dispatch(navigateToNewMeta());
        },
        onCancelEdit:               () => (dispatch, getState) => {
            const state = getState();
            const sourceID = getSourceID(state);
            const entryID = getEntryID(state);
            dispatch(setEntryEditing(false));
            loadEntry(sourceID, entryID);
        },
        onDeletePressed:            () => () => {
            promptDeleteEntry();
        },
        onEditPressed:              () => dispatch => dispatch(setEntryEditing(true)),
        onFieldValueChange:         (field, property, value) => dispatch => {
            dispatch(setFacadeValue({
                field, property, value
            }))
        },
        onOpenPressed:              () => (dispatch, getState) => {
            const state = getState();
            const url = getEntryURL(state);
            const password = getEntryPassword(state);
            if (url) {
                Alert.alert(
                    "Open URL",
                    "Press OK to launch the URL. The password will be copied to the clipboard.",
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "OK",
                            style: "default",
                            onPress: () => {
                                Clipboard.setString(password);
                                Linking.openURL(url);
                            }
                        }
                    ]
                );
            } else {
                Alert.alert(
                    "No URL",
                    "This entry doesn't contain a URL meta field."
                    [ { text: "OK", onPress: () => {} } ],
                    { cancelable: false }
                );
            }
        },
        onSavePressed:              () => (dispatch, getState) => {
            const state = getState();
            const fields = getEntryFields(state);
            const sourceID = getSourceID(state);
            const entryID = getEntryID(state);
            const entry = getEntry(sourceID, entryID);
            const facade = createEntryFacade(entry);
            facade.fields = fields;
            consumeEntryFacade(entry, facade);
            dispatch(setSaving(true));
            saveCurrentArchive()
                .then(() => {
                    updateCurrentArchive();
                    dispatch(setSaving(false));
                    dispatch(setEntryEditing(false));
                    dispatch(setNotification("Saved entry"));
                    setTimeout(() => {
                        // clear notification
                        dispatch(setNotification(""));
                    }, 1000);
                })
                .catch(err => {
                    dispatch(setSaving(false));
                    handleError("Saving failed", err);
                });
        }
    }
)(EntryPage);
