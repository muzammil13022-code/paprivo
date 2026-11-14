/**
 * Prints candidate video ids from The Organic Chemistry Tutor's channel for
 * each IAL chemistry and physics specification topic.
 *
 * Usage: node scripts/find-oct-videos.mjs > /tmp/oct.txt
 * Every id is verified through YouTube oEmbed (which also gives the title and
 * channel), so anything printed here is a real, reachable video.
 */

const CHANNEL = "UCEWpbFLzoYGPfuWUMFPSaoA"; // The Organic Chemistry Tutor
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

const TARGETS = [
  // Chemistry
  ["WCH11-1", "moles stoichiometry limiting reactant percent yield"],
  ["WCH11-2", "atomic structure electron configuration periodic table"],
  ["WCH11-3", "ionic covalent metallic bonding VSEPR"],
  ["WCH11-4", "alkanes nomenclature isomerism organic chemistry"],
  ["WCH11-5", "alkenes addition reactions electrophilic addition"],
  ["WCH12-1", "enthalpy Hess law calorimetry thermochemistry"],
  ["WCH12-2", "intermolecular forces hydrogen bonding boiling point"],
  ["WCH12-3", "redox reactions oxidation states halogens group 2"],
  ["WCH12-4", "reaction rates collision theory Le Chatelier equilibrium"],
  ["WCH12-5", "halogenoalkanes nucleophilic substitution alcohols IR NMR spectroscopy"],
  ["WCH13-1", "titration lab technique"],
  ["WCH13-2", "percent error accuracy precision significant figures"],
  ["WCH13-3", "flame test qualitative analysis ions"],
  ["WCH14-1", "rate law order of reaction Arrhenius equation"],
  ["WCH14-2", "entropy Gibbs free energy spontaneity"],
  ["WCH14-3", "equilibrium constant Kc Kp calculations"],
  ["WCH14-4", "acid base titration pH buffer calculation"],
  ["WCH14-5", "aldehydes ketones carboxylic acids chirality"],
  ["WCH15-1", "standard electrode potential electrochemical cell"],
  ["WCH15-2", "transition metals complex ions ligands"],
  ["WCH15-3", "benzene aromatic electrophilic substitution"],
  ["WCH15-4", "amines amides nitriles"],
  ["WCH15-5", "organic synthesis reactions review"],
  ["WCH16-1", "chemistry lab techniques distillation titration"],
  ["WCH16-2", "experimental error analysis chemistry lab"],
  // Physics
  ["WPH11-1", "kinematics equations of motion projectile"],
  ["WPH11-2", "Newton laws forces free body diagram"],
  ["WPH11-3", "work energy power conservation of energy"],
  ["WPH11-4", "momentum impulse collisions conservation"],
  ["WPH11-5", "fluid mechanics density pressure buoyancy"],
  ["WPH11-6", "stress strain Young modulus"],
  ["WPH12-1", "reflection refraction interference diffraction light"],
  ["WPH12-2", "waves wavelength frequency standing waves"],
  ["WPH12-3", "photoelectric effect wave particle duality de Broglie"],
  ["WPH12-4", "electric circuits Ohm law resistors series parallel"],
  ["WPH13-1", "measurement uncertainty significant figures physics"],
  ["WPH13-2", "percent error uncertainty physics lab"],
  ["WPH13-3", "graphing linear equations slope"],
  ["WPH13-4", "physics lab experiment measurements"],
  ["WPH14-1", "rotational motion torque angular momentum"],
  ["WPH14-2", "circular motion centripetal force"],
  ["WPH14-3", "electric field Coulomb law electric potential"],
  ["WPH14-4", "capacitors capacitance energy stored"],
  ["WPH14-5", "magnetic force charged particle electromagnetic induction"],
  ["WPH14-6", "nuclear physics radioactive decay subatomic particles"],
  ["WPH15-1", "thermodynamics first law ideal gas heat"],
  ["WPH15-2", "radioactive decay half life"],
  ["WPH15-3", "simple harmonic motion oscillation"],
  ["WPH15-4", "gravitational field orbital motion"],
  ["WPH15-5", "astrophysics luminosity parallax Hubble law"],
  ["WPH16-1", "physics experiment planning lab"],
  ["WPH16-2", "error analysis physics lab results"],
  ["WPH16-3", "physics core practical"],
];

async function searchIds(query, limit = 4) {
  try {
    const res = await fetch(
      `https://www.youtube.com/channel/${CHANNEL}/search?query=${encodeURIComponent(query)}`,
      {
        headers: { "user-agent": UA, "accept-language": "en" },
        signal: AbortSignal.timeout(25000),
      },
    );
    if (!res.ok) return [];
    const html = await res.text();
    return [
      ...new Set(
        [...html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)].map((m) => m[1]),
      ),
    ].slice(0, limit);
  } catch {
    return [];
  }
}

async function meta(id) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${id}`,
      )}&format=json`,
      { headers: { "user-agent": UA }, signal: AbortSignal.timeout(15000) },
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!/organic chemistry tutor/i.test(json.author_name)) return null;
    return { id, title: json.title };
  } catch {
    return null;
  }
}

for (const [tag, query] of TARGETS) {
  const ids = await searchIds(query);
  const found = [];
  for (const id of ids) {
    const m = await meta(id);
    if (m) found.push(m);
  }
  console.log(`\n== ${tag} — ${query}`);
  for (const v of found) console.log(`   ${v.id}  ${v.title}`);
}
console.log("\ndone");
