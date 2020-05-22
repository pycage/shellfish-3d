/*******************************************************************************
This file is part of Shellfish-3D.
Copyright (c) 2020 Martin Grimme <martin.grimme@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*******************************************************************************/

"use strict";

shRequire([__dirname + "/material.js"], (mtl) =>
{
    const VERTEX_SHADER = `
        attribute vec4 vPos;
        attribute vec2 vTexCoord;
        attribute vec4 vNormal;
        
        varying vec4 fPos;
        varying vec2 fTexCoord;
        varying vec4 fNormal;
        
        uniform mat4 om;
        uniform mat4 vm;
        
        void main()
        {
            highp vec4 objPos = om * vPos;

            fPos = objPos;
            fTexCoord = vTexCoord;
            // FIXME: use the right matrix: tranpose(inverse(om))
            fNormal = om * vNormal;

            gl_Position = vm * objPos;
        }
    `;

    const FRAGMENT_SHADER = `
        precision mediump float;
    
        uniform sampler2D uTexture;

        varying vec4 fPos;
        varying vec2 fTexCoord;
        varying vec4 fNormal;
        
        uniform vec4 lightPos;
        uniform vec4 lightColor;

        void main()
        {
            vec4 texColor = vec4(texture2D(uTexture, fTexCoord.st).rgb, 1.0);

            //vec3 lightPos = vec3(0, 6, 0);
            //vec4 lightColor = vec4(1.0, 1.0, 1.0, 1);

            vec3 lightDirection = normalize(lightPos.xyz - fPos.xyz);
            vec3 viewDirection = normalize(-fPos.xyz);
            vec3 h = normalize(lightDirection + viewDirection);
            vec3 normal = normalize(vec3(fNormal));

            float specularStrength = 0.5;
            float shininess = 32.0;

            vec4 ambientLight = lightColor * 0.3;
            
            float diffuseImpact = max(dot(lightDirection, normal), 0.0);
            vec4 diffuseLight = diffuseImpact * lightColor;

            float spec = pow(max(dot(normal, h), 0.0), shininess);
            vec4 specularLight = specularStrength * spec * vec4(1, 1, 1, 1);
            if (dot(lightDirection, normal) < 0.0)
            {
                specularLight = vec4(0, 0, 0, 1);
            }
            
            vec4 color = (ambientLight + diffuseLight + specularLight) * texColor;
            gl_FragColor = vec4(color.rgb, 1.0);
        }
    `;

    const programInfos = new WeakMap();

    const d = new WeakMap();

    exports.TextureMaterial = class TextureMaterial extends mtl.Material
    {
        constructor()
        {
            super();
            d.set(this, {
                source: "",
                texture: null
            });

            this.notifyable("source");
        }

        get source() { return d.get(this).source; }
        set source(s)
        {
            const priv = d.get(this);
            priv.source = s;
            this.sourceChanged();

            const img = new Image();
            img.onload = () =>
            {
                this.schedule((gl) =>
                {
                    priv.texture = gl.createTexture();
                    gl.bindTexture(gl.TEXTURE_2D, priv.texture);
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                    gl.generateMipmap(gl.TEXTURE_2D)
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    gl.bindTexture(gl.TEXTURE_2D, null);

                    console.log("texture is loaded");
                    this.invalidate();
                });
            };
            img.src = s;
        }

        initGl(gl)
        {
            if (! programInfos.get(gl))
            {
                const programId = gl.createProgram();

                const vShaderId = gl.createShader(gl.VERTEX_SHADER);
                gl.shaderSource(vShaderId, VERTEX_SHADER);
                gl.compileShader(vShaderId);
                gl.attachShader(programId, vShaderId);
        
                const fShaderId = gl.createShader(gl.FRAGMENT_SHADER);
                gl.shaderSource(fShaderId, FRAGMENT_SHADER);
                gl.compileShader(fShaderId);
                gl.attachShader(programId, fShaderId);
        
                gl.linkProgram(programId);
                gl.useProgram(programId);
        
                programInfos.set(gl, {
                    id: programId,
                    uniforms: {
                        viewMatrix: gl.getUniformLocation(programId, "vm"),
                        objectMatrix: gl.getUniformLocation(programId, "om"),
                        lightPos: gl.getUniformLocation(programId, "lightPos"),
                        lightColor: gl.getUniformLocation(programId, "lightColor")
                    },
                    attribs: {
                        vertex: gl.getAttribLocation(programId, "vPos"),
                        texture: gl.getAttribLocation(programId, "vTexCoord"),
                        normal: gl.getAttribLocation(programId, "vNormal")
                    }
                });
            }
        }

        apply(gl, entityInfo)
        {
            // nothing to do
        }

        bind(gl, om, sceneInfo, entityInfo)
        {
            this.prepare(gl);

            const programInfo = programInfos.get(gl);

            gl.useProgram(programInfo.id);

            gl.bindBuffer(gl.ARRAY_BUFFER, entityInfo.buffer.vertex);
            gl.vertexAttribPointer(programInfo.attribs.vertex, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribs.vertex);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, entityInfo.buffer.texture);
            gl.vertexAttribPointer(programInfo.attribs.texture, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribs.texture);

            gl.bindBuffer(gl.ARRAY_BUFFER, entityInfo.buffer.normal);
            gl.vertexAttribPointer(programInfo.attribs.normal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribs.normal);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, d.get(this).texture);

            gl.uniformMatrix4fv(programInfo.uniforms.viewMatrix, false, new Float32Array(sceneInfo.viewMatrix));
            gl.uniformMatrix4fv(programInfo.uniforms.objectMatrix, false, new Float32Array(om));

            if (sceneInfo.lights.length > 0)
            {
                const light = sceneInfo.lights[0];
                gl.uniform4fv(programInfo.uniforms.lightPos, new Float32Array([light.x, light.y, light.z, 1]));
                gl.uniform4fv(programInfo.uniforms.lightColor, new Float32Array(light.color.concat([1])));
            }
        }
    };
});