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

shRequire([__dirname + "/material.js", __dirname + "/util/m4.js"], (mtl, m4) =>
{
    const VERTEX_SHADER = `
        attribute vec4 vPos;
        attribute vec4 vNormal;
        attribute vec2 vTexCoord;
        
        varying vec4 fPos;
        varying vec4 fNormal;
        varying vec2 fTexCoord;
        
        uniform mat4 om;
        uniform mat4 vm;
        uniform mat4 nm;
       
        void main()
        {
            highp vec4 objPos = om * vPos;

            fPos = objPos;
            fNormal = nm * vNormal;
            fTexCoord = vTexCoord;

            gl_Position = vm * objPos;
        }
    `;

    const FRAGMENT_SHADER = `
        precision mediump float;
    
        varying vec4 fPos;
        varying vec4 fNormal;
        varying vec2 fTexCoord;
        
        uniform vec4 ambience;
        
        uniform vec4 lightPos;
        uniform vec4 lightColor;

        uniform vec4 ambientColor;
        uniform vec4 diffuseColor;
        uniform vec4 specularColor;
        uniform float shininess;

        uniform bool hasTexture;
        uniform sampler2D uTexture;

        void main()
        {
            vec3 lightDirection = normalize(lightPos.xyz - fPos.xyz);
            vec3 viewDirection = normalize(-fPos.xyz);
            vec3 halfDirection = normalize(lightDirection + viewDirection);
            vec3 normal = normalize(vec3(fNormal));

            float specularStrength = 0.5;

            vec4 ambientReflection = ambientColor * ambience;
            
            float diffuseImpact = max(dot(lightDirection, normal), 0.0);

            vec4 diffuseReflection = diffuseImpact * diffuseColor;
            if (hasTexture)
            {
                diffuseReflection *= vec4(texture2D(uTexture, fTexCoord.st).rgb, 1.0);
            }

            float spec = pow(max(dot(normal, halfDirection), 0.0), shininess);
            vec4 specularReflection = specularStrength * spec * specularColor;
            if (dot(lightDirection, normal) < 0.0)
            {
                specularReflection = vec4(0, 0, 0, 1);
            }
            
            vec4 color = (ambientReflection + diffuseReflection + specularReflection) * lightColor;
            gl_FragColor = vec4(color.rgb, 1.0);
        }
    `;

    const programInfos = new WeakMap();

    const d = new WeakMap();

    exports.SolidMaterial = class SolidMaterial extends mtl.Material
    {
        constructor()
        {
            super();
            d.set(this, {
                color: [1, 1, 1],
                ambientColor: [1, 1, 1],
                shininess: 1,
                source: "",
                texture: null
            });

            this.notifyable("color");
            this.notifyable("shininess");
            this.notifyable("source");
        }

        get color() { return d.get(this).color; }
        set color(c)
        {
            d.get(this).color = c;
            this.colorChanged();
            this.invalidate();
        }

        get shininess() { return d.get(this).shininess; }
        set shininess(s)
        {
            d.get(this).shininess = s;
            this.shininessChanged();
            this.invalidate();
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
                console.log("texture loaded: " + s);
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

                    this.invalidate();
                });
            };
            img.onerror = (err) =>
            {
                console.error("Failed to load texture: " + s);
            }
            console.log("loading texture: " + s);
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
                        normalMatrix: gl.getUniformLocation(programId, "nm"),
                        ambience: gl.getUniformLocation(programId, "ambience"),
                        lightPos: gl.getUniformLocation(programId, "lightPos"),
                        lightColor: gl.getUniformLocation(programId, "lightColor"),
                        ambientColor: gl.getUniformLocation(programId, "ambientColor"),
                        diffuseColor: gl.getUniformLocation(programId, "diffuseColor"),
                        specularColor: gl.getUniformLocation(programId, "specularColor"),
                        shininess: gl.getUniformLocation(programId, "shininess"),
                        hasTexture: gl.getUniformLocation(programId, "hasTexture")
                    },
                    attribs: {
                        vertex: gl.getAttribLocation(programId, "vPos"),
                        normal: gl.getAttribLocation(programId, "vNormal"),
                        texture: gl.getAttribLocation(programId, "vTexCoord")
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
            const priv = d.get(this);

            gl.useProgram(programInfo.id);

            gl.bindBuffer(gl.ARRAY_BUFFER, entityInfo.buffer.vertex);
            gl.vertexAttribPointer(programInfo.attribs.vertex, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribs.vertex);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, entityInfo.buffer.normal);
            gl.vertexAttribPointer(programInfo.attribs.normal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribs.normal);

            gl.bindBuffer(gl.ARRAY_BUFFER, entityInfo.buffer.texture);
            gl.vertexAttribPointer(programInfo.attribs.texture, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribs.texture);

            gl.uniformMatrix4fv(programInfo.uniforms.viewMatrix, false, new Float32Array(sceneInfo.viewMatrix));
            gl.uniformMatrix4fv(programInfo.uniforms.objectMatrix, false, new Float32Array(om));
            gl.uniformMatrix4fv(programInfo.uniforms.normalMatrix, false, new Float32Array(m4.transpose(m4.inverse(om))));

            gl.uniform4fv(programInfo.uniforms.ambience, new Float32Array(sceneInfo.ambience.concat([1])));

            gl.uniform4fv(programInfo.uniforms.ambientColor, new Float32Array(priv.ambientColor.concat([1])));
            gl.uniform4fv(programInfo.uniforms.diffuseColor, new Float32Array(priv.color.concat([1])));
            gl.uniform4fv(programInfo.uniforms.specularColor, new Float32Array([1, 1, 1, 1]));
            gl.uniform1f(programInfo.uniforms.shininess, priv.shininess);

            if (d.get(this).texture)
            {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, d.get(this).texture);
                gl.uniform1i(programInfo.uniforms.hasTexture, 1);
            }
            else
            {
                gl.uniform1i(programInfo.uniforms.hasTexture, 0);
            }

            if (sceneInfo.lights.length > 0)
            {
                const light = sceneInfo.lights[0];
                gl.uniform4fv(programInfo.uniforms.lightPos, new Float32Array([light.x, light.y, light.z, 1]));
                gl.uniform4fv(programInfo.uniforms.lightColor, new Float32Array(light.color.concat([1])));
            }
        }
    };
});