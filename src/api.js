const fetch = require('node-fetch');
const apiHost = 'https://local-playcanvas.com/api';
const FormData = require('form-data');
const Script = require('./script');
class Api {
    constructor(username, token) {
        this.username = username;
        this.token = token;        
    }

    async apiCall(url, method = 'GET', body = null, headers = {}) {
        try {
            const params = {
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            };
            if (body) {
                params.body = body;
            } else {
                params.headers['Content-Type'] = "application/json";
            }
            for (const header in headers) {
                if (headers.hasOwnProperty(header)) { // This checks that the key is not from the object's prototype chain
                  params.headers[header] = headers[header];
                }
              }            
            
            const response = await fetch(url, params);

            return response;
        } catch(error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    // get current user id from username
    async fetchUserId() {
        const response = await this.apiCall(`${apiHost}/users/${this.username}`);
        const res = await response.json();
        return res.id;
    } 

    async fetchProjects(userId) {
        const response = await this.apiCall(`${apiHost}/users/${userId}/projects`);
        const res = await response.json();
        return res.result;
    }    

    async fetchFiles(projectId) {
        const response = await this.apiCall(`${apiHost}/projects/${projectId}/assets?view=extension&limit=10000`);
        const res = await response.json();
        return res.result;
    }

    async fetchFileContent(id, fileName) {
        const response = await this.apiCall(`${apiHost}/assets/${id}/file/${fileName}`);
        const res = await response.text();
        return res;
    }

    async renameAsset(id, newName) {
        const url = `${apiHost}/assets/${id}`;
        let form = new FormData();
        form.append('name', newName);

        const response = await this.apiCall(url, 'PUT', form);
        if (!response.ok) {
            const res = await response.json();
            throw new Error(res.error);
        }

        const asset = await response.json();
        return asset;
    } 

    async copyAsset(sourceProjectId, assetId, targetProjectId, folderId) {
        const url = `${apiHost}/assets/paste`;
        const body = {
            projectId: sourceProjectId,
            assets: [assetId],
            targetProjectId: targetProjectId,          
            targetFolderId: folderId
        };

        const response = await this.apiCall(url, 'POST', JSON.stringify(body), {
            'Content-Type': "application/json"
        });
        if (!response.ok) {
            const res = await response.json();
            throw new Error(res.error);
        }

        const asset = await response.json();
        return asset;
    } 

    async createAsset(projectId, folderId, name, type) {
        const url = `${apiHost}/assets/`;

        const ext = name.split('.').pop();
        const asset = (ext === 'js') ? Script.create({filename: name}) : {
            contentType: 'text/plain',
            content: '',
            filename: name,
            preload: false            
        };

        const form = new FormData();
        if (type !== 'folder') {
            form.append('file', asset.content, {
                filename: asset.filename,
                contentType: asset.contentType
            });
        }

        form.append('preload', asset.preload ? 'true' : 'false');
        form.append('projectId', projectId);
        form.append('name', name);

        if (type) {
            form.append('type', type);
        }

        if (folderId) {
            form.append('parent', folderId);
        }

        const response = await this.apiCall(url, 'POST', form);
        if (!response.ok) {
            const res = await response.json();
            console.error('file upload failed:', res.error);
            throw new Error(res.error);
        }

        return await response.json();
    } 

    async deleteAsset(id) {
        const response = await this.apiCall(`${apiHost}/assets/${id}`, 'DELETE');
        const res = await response.text();
        return res;
    }    

    async uploadFile(id, filename, modifiedAt, data) {
        const url = `${apiHost}/assets/${id}`;
        const form = new FormData();
        form.append('file', data, {
            filename: filename,
            contentType: 'text/plain'
        });
        form.append('baseModificationTime', modifiedAt);

        const response = await this.apiCall(url, 'PUT', form);
        if (!response.ok) {
            const res = await response.json();
            console.error('file upload failed:', res.error);
            throw new Error(res.error);
        }

        const asset = await response.json();
        return asset;
    }
}

module.exports = Api;