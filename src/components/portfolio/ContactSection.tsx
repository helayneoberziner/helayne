import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useScrollAnimation, fadeInUpVariants, staggerContainerVariants, staggerItemVariants } from "@/hooks/use-scroll-animation";

const ContactSection = () => {
  const whatsappNumber = "5547992158042";
  const instagramHandle = "agenciaracun";
  const { toast } = useToast();
  const { ref, isInView } = useScrollAnimation();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  
  // Rate limiting: track last submission time
  const lastSubmitTime = useRef<number>(0);
  const RATE_LIMIT_MS = 60000; // 60 seconds between submissions

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    const timeSinceLastSubmit = now - lastSubmitTime.current;
    
    if (timeSinceLastSubmit < RATE_LIMIT_MS) {
      const remainingSeconds = Math.ceil((RATE_LIMIT_MS - timeSinceLastSubmit) / 1000);
      return { allowed: false, remainingSeconds };
    }
    
    return { allowed: true, remainingSeconds: 0 };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha nome e email.",
        variant: "destructive",
      });
      return;
    }

    // Check rate limit before submitting
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      toast({
        title: "Aguarde um momento",
        description: `Por favor, aguarde ${rateLimitCheck.remainingSeconds} segundos antes de enviar novamente.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-lead-notification", {
        body: formData,
      });

      if (error) throw error;

      // Update last submit time on successful submission
      lastSubmitTime.current = Date.now();

      toast({
        title: "Mensagem enviada! 🎉",
        description: "Obrigada pelo contato! Em breve retornarei.",
      });

      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (error: any) {
      console.error("Error submitting lead:", error);
      toast({
        title: "Erro ao enviar",
        description: "Tente novamente ou entre em contato pelo WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contato" className="px-6 py-20 bg-gradient-to-b from-soft-cream to-champagne" ref={ref}>
      <motion.div 
        className="max-w-lg mx-auto space-y-8"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={staggerContainerVariants}
      >
        {/* Header */}
        <motion.div className="text-center space-y-4" variants={fadeInUpVariants} transition={{ duration: 0.6 }}>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">
            Vamos conversar sobre o seu negócio?
          </h2>
          <p className="text-muted-foreground">
            Estou pronta para ajudar sua marca a crescer com estratégia e criatividade.
          </p>
        </motion.div>

        {/* Lead Capture Form */}
        <motion.form 
          onSubmit={handleSubmit} 
          className="space-y-4 bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm"
          variants={staggerItemVariants}
        >
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Nome *
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Seu nome"
              value={formData.name}
              onChange={handleInputChange}
              maxLength={100}
              required
              className="bg-white/80"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email *
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={handleInputChange}
              maxLength={255}
              required
              className="bg-white/80"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              WhatsApp
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="(00) 00000-0000"
              value={formData.phone}
              onChange={handleInputChange}
              maxLength={20}
              className="bg-white/80"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">
              Mensagem
            </Label>
            <Textarea
              id="message"
              name="message"
              placeholder="Conte um pouco sobre seu projeto..."
              value={formData.message}
              onChange={handleInputChange}
              maxLength={1000}
              rows={3}
              className="bg-white/80 resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="w-full h-14 text-base font-medium gradient-rose text-white shadow-lg hover:opacity-90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Enviar Mensagem
              </>
            )}
          </Button>
        </motion.form>

        {/* Divider */}
        <motion.div className="flex items-center gap-4" variants={staggerItemVariants}>
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground">ou fale diretamente</span>
          <div className="flex-1 h-px bg-border" />
        </motion.div>

        {/* CTA Buttons */}
        <motion.div className="flex flex-col gap-3" variants={staggerItemVariants}>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
            asChild
            size="lg"
            className="w-full h-14 text-base font-medium bg-[#25D366] hover:bg-[#22c55e] text-white shadow-lg"
          >
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              WhatsApp
            </a>
          </Button>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            asChild
            size="lg"
            className="w-full h-14 text-base font-medium gradient-rose text-white shadow-lg hover:opacity-90"
          >
            <a
              href={`https://instagram.com/${instagramHandle}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              Instagram
            </a>
          </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default ContactSection;
