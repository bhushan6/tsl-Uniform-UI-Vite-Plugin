import { extend, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three/webgpu';
import {
    Fn,
    vec3,
    uv,
    mix,
    uniform,
    positionGeometry,
} from 'three/tsl';

// @ts-ignore
extend(THREE);

const Core = () => {
    const { scene } = useThree();

    useEffect(() => {
        const dirLight = new THREE.DirectionalLight(0xffffff, 4.0);
        dirLight.position.set(10, 10, 10);
        scene.add(dirLight);
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
    }, []);

    const { nodes } = useMemo(() => {
        const color1 = uniform(new THREE.Color("red"), "color");
        const color2 = uniform(new THREE.Color("yellow"), "color");
        const gradientNode = Fn(() => {

            return mix(color1, color2, uv().y);
        });

        const sphereColorNode = gradientNode();
        /**
         * @gui
         * @range: { min: -50, max: 50, step: 1 }
         */
        const displacement = uniform(0);
        const positionNode = Fn(() => {

            return positionGeometry.add(vec3(0, displacement, 0))
        })()

        return {
            nodes: {
                colorNode: sphereColorNode,
                positionNode,
            },
        };

    }, []);

    return (
        <>
            <mesh >
                <sphereGeometry args={[50, 16, 16]} />
                {/* @ts-ignore */}
                <meshBasicNodeMaterial
                    {...nodes}
                    side={THREE.BackSide}
                />
            </mesh>
            <mesh>
                <sphereGeometry args={[1, 256]} />
                <meshStandardMaterial color='white' />
            </mesh>
        </>
    );
};

export default Core;
