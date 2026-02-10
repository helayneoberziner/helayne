import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="px-6 py-8 bg-primary text-primary-foreground">
      <div className="max-w-lg mx-auto text-center space-y-3">
        <h3 className="font-display text-xl font-semibold">Racun</h3>
        <p className="text-sm text-primary-foreground/80">
          Marketing e Produção Audiovisual
        </p>
        <div className="w-12 h-[1px] bg-primary-foreground/30 mx-auto" />
        <p className="text-xs text-primary-foreground/60">
          Atendimento em Santa Catarina e região
        </p>
        <p className="text-xs text-primary-foreground/40 pt-2">
          © {new Date().getFullYear()} Racun. Todos os direitos reservados.
        </p>
        <Link to="/admin" className="text-[10px] text-primary-foreground/20 hover:text-primary-foreground/40 transition-colors">
          •
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
