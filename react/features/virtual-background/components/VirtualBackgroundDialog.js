// @flow
/* eslint-disable react/jsx-no-bind, no-return-assign */
import Spinner from '@atlaskit/spinner';
import { jitsiLocalStorage } from '@jitsi/js-utils/jitsi-local-storage';
import React, { useState, useEffect } from 'react';
import uuid from 'uuid';

import { Dialog } from '../../base/dialog';
import { translate } from '../../base/i18n';
import { Icon, IconBlurBackground, IconCancelSelection } from '../../base/icons';
import { connect } from '../../base/redux';
import { Tooltip } from '../../base/tooltip';
import { toggleBackgroundEffect } from '../actions';
import { resizeImage, toDataURL } from '../functions';
import logger from '../logger';

// The limit of virtual background uploads is 24. When the number
// of uploads is 25 we trigger the deleteStoredImage function to delete
// the first/oldest uploaded background.
const backgroundsLimit = 25;
const images = [
    {
        id: '1',
        src: 'images/virtual-background/background-1.jpg'
    },
    {
        id: '2',
        src: 'images/virtual-background/background-2.jpg'
    },
    {
        id: '3',
        src: 'images/virtual-background/background-3.jpg'
    },
    {
        id: '4',
        src: 'images/virtual-background/background-4.jpg'
    }
];
type Props = {

    /**
     * Returns the selected thumbnail identifier.
     */
    _selectedThumbnail: string,

    /**
     * The redux {@code dispatch} function.
     */
    dispatch: Function,

    /**
     * Invoked to obtain translated strings.
     */
    t: Function
};

/**
 * Renders virtual background dialog.
 *
 * @returns {ReactElement}
 */
function VirtualBackground({ _selectedThumbnail, dispatch, t }: Props) {
    const localImages = jitsiLocalStorage.getItem('virtualBackgrounds');
    const [ storedImages, setStoredImages ] = useState((localImages && JSON.parse(localImages)) || []);
    const [ loading, isloading ] = useState(false);

    const deleteStoredImage = image => {
        setStoredImages(storedImages.filter(item => item !== image));
    };

    /**
     * Updates stored images on local storage.
     */
    useEffect(() => {
        try {
            jitsiLocalStorage.setItem('virtualBackgrounds', JSON.stringify(storedImages));
        } catch (err) {
            // Preventing localStorage QUOTA_EXCEEDED_ERR
            err && deleteStoredImage(storedImages[0]);
        }
        if (storedImages.length === backgroundsLimit) {
            deleteStoredImage(storedImages[0]);
        }
    }, [ storedImages ]);

    const enableBlur = async (blurValue, selection) => {
        isloading(true);
        await dispatch(
            toggleBackgroundEffect({
                backgroundType: 'blur',
                enabled: true,
                blurValue,
                selectedThumbnail: selection
            })
        );
        isloading(false);
    };

    const removeBackground = async () => {
        isloading(true);
        await dispatch(
            toggleBackgroundEffect({
                enabled: false,
                selectedThumbnail: 'none'
            })
        );
        isloading(false);
    };

    const setUploadedImageBackground = async image => {
        isloading(true);
        await dispatch(
            toggleBackgroundEffect({
                backgroundType: 'image',
                enabled: true,
                url: image.src,
                selectedThumbnail: image.id
            })
        );
        isloading(false);
    };

    const setImageBackground = async image => {
        isloading(true);
        const url = await toDataURL(image.src);

        await dispatch(
            toggleBackgroundEffect({
                backgroundType: 'image',
                enabled: true,
                url,
                selectedThumbnail: image.id
            })
        );
        isloading(false);
    };

    const uploadImage = async imageFile => {
        const reader = new FileReader();

        reader.readAsDataURL(imageFile[0]);
        reader.onload = async () => {
            const url = await resizeImage(reader.result);
            const uuId = uuid.v4();

            isloading(true);
            setStoredImages([
                ...storedImages,
                {
                    id: uuId,
                    src: url
                }
            ]);
            await dispatch(
                toggleBackgroundEffect({
                    backgroundType: 'image',
                    enabled: true,
                    url,
                    selectedThumbnail: uuId
                })
            );
            isloading(false);
        };
        reader.onerror = () => {
            isloading(false);
            logger.error('Failed to upload virtual image!');
        };
    };

    return (
        <Dialog
            hideCancelButton = { true }
            submitDisabled = { false }
            titleKey = { 'virtualBackground.title' }
            width = '450px'>
            {loading ? (
                <div className = 'virtual-background-loading'>
                    <span className = 'loading-content-text'>{t('virtualBackground.pleaseWait')}</span>
                    <Spinner
                        isCompleting = { false }
                        size = 'medium' />
                </div>
            ) : (
                <div>
                    <div className = 'virtual-background-dialog'>
                        <Tooltip
                            content = { t('virtualBackground.removeBackground') }
                            position = { 'top' }>
                            <div
                                className = { _selectedThumbnail === 'none'
                                    ? 'none-selected' : 'virtual-background-none' }
                                onClick = { removeBackground }>
                                {t('virtualBackground.none')}
                            </div>
                        </Tooltip>
                        <Tooltip
                            content = { t('virtualBackground.slightBlur') }
                            position = { 'top' }>
                            <Icon
                                className = { _selectedThumbnail === 'slight-blur' ? 'blur-selected' : '' }
                                onClick = { () => enableBlur(8, 'slight-blur') }
                                size = { 50 }
                                src = { IconBlurBackground } />
                        </Tooltip>
                        <Tooltip
                            content = { t('virtualBackground.blur') }
                            position = { 'top' }>
                            <Icon
                                className = { _selectedThumbnail === 'blur' ? 'blur-selected' : '' }
                                onClick = { () => enableBlur(25, 'blur') }
                                size = { 50 }
                                src = { IconBlurBackground } />
                        </Tooltip>
                        {images.map((image, index) => (
                            <img
                                className = { _selectedThumbnail === image.id ? 'thumbnail-selected' : 'thumbnail' }
                                key = { index }
                                onClick = { () => setImageBackground(image) }
                                onError = { event => event.target.style.display = 'none' }
                                src = { image.src } />
                        ))}
                        <Tooltip
                            content = { t('virtualBackground.uploadImage') }
                            position = { 'top' }>
                            <label
                                className = 'custom-file-upload'
                                htmlFor = 'file-upload'>
                                +
                            </label>
                            <input
                                accept = 'image/*'
                                className = 'file-upload-btn'
                                id = 'file-upload'
                                onChange = { e => uploadImage(e.target.files) }
                                type = 'file' />
                        </Tooltip>
                    </div>

                    <div className = 'virtual-background-dialog'>
                        {storedImages.map((image, index) => (
                            <div
                                className = { 'thumbnail-container' }
                                key = { index }>
                                <img
                                    className = { _selectedThumbnail === image.id ? 'thumbnail-selected' : 'thumbnail' }
                                    onClick = { () => setUploadedImageBackground(image) }
                                    onError = { event => event.target.style.display = 'none' }
                                    src = { image.src } />
                                <Icon
                                    className = { 'delete-image-icon' }
                                    onClick = { () => deleteStoredImage(image) }
                                    size = { 15 }
                                    src = { IconCancelSelection } />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Dialog>
    );
}

/**
 * Maps (parts of) the redux state to the associated props for the
 * {@code VirtualBackground} component.
 *
 * @param {Object} state - The Redux state.
 * @private
 * @returns {{
 *     _selectedThumbnail: string
 * }}
 */
function _mapStateToProps(state): Object {
    return {
        _selectedThumbnail: state['features/virtual-background'].selectedThumbnail
    };
}

export default translate(connect(_mapStateToProps)(VirtualBackground));
