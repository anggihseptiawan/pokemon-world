import { gql, request } from 'graphql-request';
import { mkdirSync, writeFileSync } from 'node:fs';

import { API_ENDPOINT, GENERATION_ROMAN_NUM } from '../src/constants/pokemon';
import { Maybe, Pokemon_V2_Pokemonspecies } from '../src/generated/graphql.types';

const query = gql`
  {
    pokemon_v2_evolutionchain {
      pokemon_v2_pokemonspecies {
        id
        name
        evolves_from_species_id
        pokemon_v2_generation {
          id
        }
        pokemon_v2_pokemons(limit: 1) {
          name
          pokemon_v2_pokemontypes {
            pokemon_v2_type {
              name
            }
          }
        }
      }
    }
  }
`;

type FetchPokemonEvolutionResponse = {
  pokemon_v2_evolutionchain: {
    pokemon_v2_pokemonspecies: PokemonSpeciesRaw[];
  }[];
};

type PokemonSpeciesRaw = Pick<
  Pokemon_V2_Pokemonspecies,
  'id' | 'name' | 'evolves_from_species_id' | 'pokemon_v2_generation' | 'pokemon_v2_pokemons'
>;

type PokemonSpecies = {
  evolvesFromSpeciesId?: Maybe<number>;
  id: number;
  name: string;
  generationId: number;
  generation: string;
  types: string[];
};

const transformSpecies = (species: PokemonSpeciesRaw): PokemonSpecies => ({
  evolvesFromSpeciesId: species.evolves_from_species_id,
  id: species.id,
  name: species.name,
  generationId: species.pokemon_v2_generation!.id,
  generation:
    GENERATION_ROMAN_NUM[species.pokemon_v2_generation!.id as keyof typeof GENERATION_ROMAN_NUM],
  types: species.pokemon_v2_pokemons[0].pokemon_v2_pokemontypes.map(
    ({ pokemon_v2_type }) => pokemon_v2_type!.name,
  ),
});

request<FetchPokemonEvolutionResponse>(API_ENDPOINT, query).then((data) => {
  const evolutions: PokemonSpecies[][] = [];
  let i = 0;
  data.pokemon_v2_evolutionchain.forEach(({ pokemon_v2_pokemonspecies }) => {
    evolutions[i] = [];
    pokemon_v2_pokemonspecies.forEach((speciesRaw) => {
      const species = transformSpecies(speciesRaw);
      if (
        evolutions[i].some((item) => item.evolvesFromSpeciesId === species.evolvesFromSpeciesId)
      ) {
        evolutions[i + 1] = [...evolutions[i].slice(0, evolutions[i].length - 1), species];
        i++;
      } else {
        evolutions[i].push(species);
      }
    });
    i++;
  });

  mkdirSync('public/generated', { recursive: true });
  writeFileSync('public/generated/pokemon-evolution.json', JSON.stringify(evolutions));
});
