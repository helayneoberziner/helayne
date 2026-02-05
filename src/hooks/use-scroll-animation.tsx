 import { useRef } from "react";
 import { useInView } from "framer-motion";
import type { Variants } from "framer-motion";
 
 export const useScrollAnimation = (options?: { once?: boolean; margin?: string }) => {
   const ref = useRef(null);
   const isInView = useInView(ref, {
     once: options?.once ?? true,
    margin: options?.margin ?? "-100px 0px -100px 0px" as any
   });
 
   return { ref, isInView };
 };
 
export const fadeInUpVariants: Variants = {
   hidden: { opacity: 0, y: 30 },
   visible: { opacity: 1, y: 0 }
 };
 
export const fadeInVariants: Variants = {
   hidden: { opacity: 0 },
   visible: { opacity: 1 }
 };
 
export const scaleInVariants: Variants = {
   hidden: { opacity: 0, scale: 0.9 },
   visible: { opacity: 1, scale: 1 }
 };
 
export const staggerContainerVariants: Variants = {
   hidden: { opacity: 0 },
   visible: {
     opacity: 1,
     transition: {
       staggerChildren: 0.1,
       delayChildren: 0.1
     }
   }
 };
 
export const staggerItemVariants: Variants = {
   hidden: { opacity: 0, y: 20 },
   visible: { 
     opacity: 1, 
     y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
   }
 };