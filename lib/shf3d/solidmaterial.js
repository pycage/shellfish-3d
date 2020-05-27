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
        attribute vec4 vTangent;
        attribute vec2 vTexCoord;
        
        varying vec4 fPos;
        varying vec4 fNormal;
        varying vec4 fTangent;
        varying vec2 fTexCoord;
        varying mat3 fTbn;
        
        uniform mat4 om;
        uniform mat4 vm;

        void main()
        {
            highp vec4 objPos = om * vPos;

            fPos = objPos;
            fNormal = vNormal;
            fTangent = vTangent;
            fTexCoord = vTexCoord;

            vec4 bt = vec4(cross(vTangent.xyz, vNormal.xyz), 0.0);
            fTbn = mat3(
                normalize(vec3(vTangent)),
                normalize(vec3(bt)),
                normalize(vec3(vNormal))
            );

            gl_Position = vm * objPos;
        }
    `;

    const FRAGMENT_SHADER = `
        precision mediump float;
    
        varying vec4 fPos;
        varying vec4 fNormal;
        varying vec4 fTangent;
        varying vec2 fTexCoord;
        varying mat3 fTbn;
        
        uniform vec4 ambience;
        
        uniform vec4 lightPos;
        uniform vec4 lightColor;
        uniform float lightRange;

        uniform vec4 diffuseColor;
        uniform vec4 specularColor;
        uniform vec4 emitColor;
        uniform float shininess;

        uniform bool hasTexture;
        uniform bool hasBumpTexture;
        uniform sampler2D texture;
        uniform sampler2D bumpTexture;

        uniform mat4 nm;

        void main()
        {
            vec3 lightVector = lightPos.xyz - fPos.xyz;
            float lightDistance = length(lightVector);
            vec3 lightDirection = normalize(lightVector);
            vec3 viewDirection = normalize(-fPos.xyz);
            vec3 halfDirection = normalize(lightDirection + viewDirection);
            
            vec3 normal;
            
            if (hasBumpTexture)
            {
                normal = normalize(texture2D(bumpTexture, fTexCoord.st).rgb * 2.0 - 1.0);
                normal = fTbn * normal;
            }
            else
            {
                normal = vec3(fNormal);
            }
            normal = normalize(vec3(nm * vec4(normal, 0.0)));

            float diffuseImpact = max(dot(lightDirection, normal), 0.0);
            float specularStrength = 0.5;
                       
            vec4 diffuseReflection = diffuseColor;
            if (hasTexture)
            {
                vec4 texColor = texture2D(texture, fTexCoord.st);
                if (texColor.a < 0.01)
                {
                    //discard();
                }
                diffuseReflection += vec4(texColor.rgb, 1.0);
            }
            //diffuseReflection = vec4((normal + 1.0) / 2.0, 1.0);

            float spec = pow(max(dot(normal, halfDirection), 0.0), shininess);
            vec4 specularReflection = specularStrength * spec * specularColor;
            if (dot(lightDirection, normal) < 0.0)
            {
                specularReflection = vec4(0, 0, 0, 1);
            }

            float attenuation = clamp(1.0 - lightDistance / lightRange, 0.0, 1.0);
            attenuation *= attenuation;
            
            vec4 color = emitColor +
                         diffuseReflection * ambience +
                         attenuation * diffuseReflection * diffuseImpact * lightColor +
                         attenuation * specularReflection * lightColor;
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
                emitColor: [0, 0, 0],
                shininess: 1,
                source: "",
                bumpMap: "",
                texture: null,
                bumpTexture: null
            });

            this.notifyable("bumpMap");
            this.notifyable("color");
            this.notifyable("emitColor");
            this.notifyable("shininess");
            this.notifyable("source");
        }

        get emitColor() { return d.get(this).emitColor; }
        set emitColor(c)
        {
            d.get(this).emitColor = c;
            this.emitColorChanged();
            this.invalidate();
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

        get bumpMap() { return d.get(this).bumpMap; }
        set bumpMap(b)
        {
            const priv = d.get(this);
            priv.bumpMap = b;
            this.bumpMapChanged();

            const img = new Image();
            img.onload = () =>
            {
                console.log("bump map loaded: " + b);
                this.schedule((gl) =>
                {
                    priv.bumpTexture = gl.createTexture();
                    gl.bindTexture(gl.TEXTURE_2D, priv.bumpTexture);
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
                console.error("Failed to load bump map: " + b);
            }
            console.log("loading bump map: " + b);
            img.src = b;
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
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
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
                        lightRange: gl.getUniformLocation(programId, "lightRange"),
                        diffuseColor: gl.getUniformLocation(programId, "diffuseColor"),
                        emitColor: gl.getUniformLocation(programId, "emitColor"),
                        specularColor: gl.getUniformLocation(programId, "specularColor"),
                        shininess: gl.getUniformLocation(programId, "shininess"),
                        hasTexture: gl.getUniformLocation(programId, "hasTexture"),
                        texture: gl.getUniformLocation(programId, "texture"),
                        hasBumpTexture: gl.getUniformLocation(programId, "hasBumpTexture"),
                        bumpTexture: gl.getUniformLocation(programId, "bumpTexture")
                    },
                    attribs: {
                        vertex: gl.getAttribLocation(programId, "vPos"),
                        normal: gl.getAttribLocation(programId, "vNormal"),
                        tangent: gl.getAttribLocation(programId, "vTangent"),
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

            gl.bindBuffer(gl.ARRAY_BUFFER, entityInfo.buffer.tangent);
            gl.vertexAttribPointer(programInfo.attribs.tangent, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribs.tangent);

            gl.bindBuffer(gl.ARRAY_BUFFER, entityInfo.buffer.texture);
            gl.vertexAttribPointer(programInfo.attribs.texture, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribs.texture);

            // our matrices are row-major and must thus be transposed for OpenGL
            gl.uniformMatrix4fv(programInfo.uniforms.viewMatrix, false, new Float32Array(m4.transpose(sceneInfo.viewMatrix)));
            gl.uniformMatrix4fv(programInfo.uniforms.objectMatrix, false, new Float32Array(m4.transpose(om)));
            gl.uniformMatrix4fv(programInfo.uniforms.normalMatrix, false, new Float32Array(m4.inverse(om)));  // transposed of transposed

            gl.uniform4fv(programInfo.uniforms.ambience, new Float32Array(sceneInfo.ambience.concat([1])));

            gl.uniform4fv(programInfo.uniforms.diffuseColor, new Float32Array(priv.color.concat([1])));
            gl.uniform4fv(programInfo.uniforms.emitColor, new Float32Array(priv.emitColor.concat([1])));
            gl.uniform4fv(programInfo.uniforms.specularColor, new Float32Array([1, 1, 1, 1]));
            gl.uniform1f(programInfo.uniforms.shininess, priv.shininess);

            if (d.get(this).texture)
            {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, d.get(this).texture);
                gl.uniform1i(programInfo.uniforms.texture, 0);
                gl.uniform1i(programInfo.uniforms.hasTexture, 1);
            }
            else
            {
                gl.uniform1i(programInfo.uniforms.hasTexture, 0);
            }

            if (d.get(this).bumpTexture)
            {
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, d.get(this).bumpTexture);
                gl.uniform1i(programInfo.uniforms.bumpTexture, 1);
                gl.uniform1i(programInfo.uniforms.hasBumpTexture, 1);
            }
            else
            {
                gl.uniform1i(programInfo.uniforms.hasBumpTexture, 0);
            }

            if (sceneInfo.lights.length > 0)
            {
                const light = sceneInfo.lights[0];
                gl.uniform4fv(programInfo.uniforms.lightPos, new Float32Array([light.x, light.y, light.z, 1]));
                gl.uniform4fv(programInfo.uniforms.lightColor, new Float32Array(light.color.concat([1])));
                gl.uniform1f(programInfo.uniforms.lightRange, light.range);
            }
        }
    };
});