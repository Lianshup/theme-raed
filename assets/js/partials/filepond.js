import * as FilePond from 'filepond';

let label = [['Drag and drop the image here', 'or browse your device'], ['اسحب او افلت الصورة هنا', 'او تصفح من جهازك']];
label = label[salla.config.language.is_rtl ? 1 : 0];

FilePond.registerPlugin(
    require('filepond-plugin-image-preview'),
    require('filepond-plugin-image-exif-orientation'),
    require('filepond-plugin-file-validate-type'),
    require('filepond-plugin-file-poster')
);

class FileUploader {
    /**
     * 💡 There are two senarios for old files:
     * 1- without delete endpoint, pass default images via: `data-default="fileUrl1,fileUrl2"`
     * 2- with delete endpoint, pass files metadata via: `data-files="[{id:*,url:*,name:*},...]"`
     *
     * 💡 You can set `data-instant-upload` for instant upload
     * @param {HTMLInputElement|string} input
     * @param options
     */
    constructor(input = '.filepond', options = {}) {
        let elements = typeof input == 'object' ? [input] : document.querySelectorAll(input);
        //return latest filepond instance
        this.fileponds = [];
        elements.forEach(input => this.initFilepond(input, options));
    }

    /**
     * @param {HTMLInputElement} input
     * @return {FilePond}
     */
    initFilepond(input, options) {
        //todo:: expline why this
        if (input.disabled) {
            input.removeAttribute('disabled');
            if (input.hasAttribute('required')) {
                input.removeAttribute('required');
            }
        }

        this.fileponds.push(FilePond.create(input, {
            allowBrowse     : true,
            allowDrop       : true,
            files           : this.getFilesFromInput(input),
            server          : this.requestProperties(input),
            instantUpload   : input.dataset.hasOwnProperty('instantUpload'),
            beforeRemoveFile: ({getMetadata: file}) => file('id') && salla.cart.api.deleteFile(file('id')) || salla.log(file()),
            labelIdle       : `<i class="sicon-camera block !text-2xl opacity-75"></i><span class="block">${label[0]}</span><span class="filepond--label-action">${label[1]}</span>`,
            ...options,
        }));
    }

    /**
     * @param {HTMLInputElement} input
     */
    getFilesFromInput(input) {
        if (!input.dataset.files && !input.dataset.default) {
            return [];
        }
        try {
            /**
             * @type {[{id:number, url:string, name:string}]}
             */
            let files = input.dataset.default ? input.dataset.default.split(',') : JSON.parse(input.dataset.files);
            return files.map(file => {
                let metadata = typeof file == 'string'
                    ? {poster: file, name: file}
                    : {poster: file.url, id: file.id, name: file.name};
                return {
                    source : metadata.id,
                    options: {
                        type: 'local',
                        //todo:: remove default size
                        file    : {name: metadata.name || metadata.id, size: 3000000},
                        metadata: metadata,
                    },
                };
            });
        } catch (e) {
            salla.log('failed To get files from: ' + (input.dataset.files || input.dataset.default));
        }
        return [];
    }

    /**
     *
     * @param {HTMLInputElement} input
     * @return {{process: {onerror: (function(*=)), onload: (function(*=): *), ondata: (function(*): *)}, url}|null}
     */
    requestProperties({dataset: data}) {
        return !data.url
            ? null
            : {
                url    : data.url,
                process: {
                    onload : response => JSON.parse(response).data.filePath,
                    onerror: response => JSON.parse(response).error.fields.image_file[0] || salla.lang.get('common.errors.error_occurred'),
                    ondata : formData => {
                        [['_token', salla.config.token], ['cart_item_id', data.itemId], ['product_id', data.productId]]
                            .forEach((key, value) => value && formData.append(key, value));
                        return formData;
                    }
                }
            };
    }

    /**
     * @return {FilePond}
     */
    getFilepond() {
        return this.fileponds[0];
    }

    /**
     * @return {FilePond}
     */
    getFile() {
        return this.getFilepond()?.getFile();
    }
}

window.FileUploader = FileUploader;