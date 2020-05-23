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
        
        varying vec4 fPos;
        varying vec4 fNormal;
        
        uniform mat4 om;
        uniform mat4 vm;
        uniform mat4 nm;
       
        void main()
        {
            highp vec4 objPos = om * vPos;

            fPos = objPos;
            fNormal = nm * vNormal;

            gl_Position = vm * objPos;
        }
    `;

    const FRAGMENT_SHADER = `
        precision mediump float;
    
        varying vec4 fPos;
        varying vec4 fNormal;
        
        uniform vec4 lightPos;
        uniform vec4 lightColor;

        uniform vec4 ambientColor;
        uniform vec4 diffuseColor;
        uniform vec4 specularColor;
        uniform float shininess;

        void main()
        {
            vec3 lightDirection = normalize(lightPos.xyz - fPos.xyz);
            vec3 viewDirection = normalize(-fPos.xyz);
            vec3 halfDirection = normalize(lightDirection + viewDirection);
            vec3 normal = normalize(vec3(fNormal));

            float specularStrength = 0.5;

            vec4 ambientLight = ambientColor * 0.3;
            
            float diffuseImpact = max(dot(lightDirection, normal), 0.0);
            vec4 diffuseLight = diffuseImpact * diffuseColor;

            float spec = pow(max(dot(normal, halfDirection), 0.0), shininess);
            vec4 specularLight = specularStrength * spec * specularColor;
            if (dot(lightDirection, normal) < 0.0)
            {
                specularLight = vec4(0, 0, 0, 1);
            }
            
            vec4 color = (ambientLight + diffuseLight + specularLight) * lightColor;
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
                color: [1, 1, 0],
                shininess: 0
            });

            this.notifyable("color");
            this.notifyable("shininess");
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
                        lightPos: gl.getUniformLocation(programId, "lightPos"),
                        lightColor: gl.getUniformLocation(programId, "lightColor"),
                        ambientColor: gl.getUniformLocation(programId, "ambientColor"),
                        diffuseColor: gl.getUniformLocation(programId, "diffuseColor"),
                        specularColor: gl.getUniformLocation(programId, "specularColor"),
                        shininess: gl.getUniformLocation(programId, "shininess"),
                    },
                    attribs: {
                        vertex: gl.getAttribLocation(programId, "vPos"),
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
            const programInfo = programInfos.get(gl);

            gl.useProgram(programInfo.id);

            gl.bindBuffer(gl.ARRAY_BUFFER, entityInfo.buffer.vertex);
            gl.vertexAttribPointer(programInfo.attribs.vertex, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribs.vertex);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, entityInfo.buffer.normal);
            gl.vertexAttribPointer(programInfo.attribs.normal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribs.normal);

            gl.uniformMatrix4fv(programInfo.uniforms.viewMatrix, false, new Float32Array(sceneInfo.viewMatrix));
            gl.uniformMatrix4fv(programInfo.uniforms.objectMatrix, false, new Float32Array(om));
            gl.uniformMatrix4fv(programInfo.uniforms.normalMatrix, false, new Float32Array(m4.transpose(m4.inverse(om))));

            gl.uniform4fv(programInfo.uniforms.ambientColor, new Float32Array(this.color.concat([1])));
            gl.uniform4fv(programInfo.uniforms.diffuseColor, new Float32Array(this.color.concat([1])));
            gl.uniform4fv(programInfo.uniforms.specularColor, new Float32Array([1, 1, 1, 1]));
            gl.uniform1fv(programInfo.uniforms.shininess, new Float32Array([this.shininess]));

            if (sceneInfo.lights.length > 0)
            {
                const light = sceneInfo.lights[0];
                gl.uniform4fv(programInfo.uniforms.lightPos, new Float32Array([light.x, light.y, light.z, 1]));
                gl.uniform4fv(programInfo.uniforms.lightColor, new Float32Array(light.color.concat([1])));
            }
        }
    };
});