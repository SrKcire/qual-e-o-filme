import { useEffect, useState, type ReactNode } from 'react'
import { MAX_ATTEMPTS, frameUrl, isCorrectGuess, roundState, type Guess, type Movie } from '../lib/game'
import { FrameViewer } from './FrameViewer'
import { GuessInput } from './GuessInput'
import { GuessList } from './GuessList'
import { AttemptPips } from './AttemptPips'

interface Props {
  movie: Movie
  guesses: Guess[]
  onGuess: (guess: Guess) => void
  /** Mostrado no lugar do campo de resposta quando a rodada termina */
  result: ReactNode
}

/** Uma rodada: frames, campo de chute e lista de erros. Use `key` no pai para reiniciar. */
export function Round({ movie, guesses, onGuess, result }: Props) {
  const { finished, revealed } = roundState(guesses)
  const [viewing, setViewing] = useState(finished ? guesses.length - 1 : revealed - 1)

  // a cada chute, mostra o frame recém-liberado (ou o do acerto, no fim)
  const [seenGuesses, setSeenGuesses] = useState(guesses.length)
  if (seenGuesses !== guesses.length) {
    setSeenGuesses(guesses.length)
    setViewing(finished ? guesses.length - 1 : guesses.length)
  }

  // pré-carrega o próximo frame para a troca ser instantânea
  useEffect(() => {
    if (revealed < MAX_ATTEMPTS) new Image().src = frameUrl(movie.frames[revealed])
  }, [movie, revealed])

  function guess(g: Guess) {
    if (!finished) onGuess(g)
  }

  const points = MAX_ATTEMPTS - guesses.length

  return (
    <div className="flex flex-col gap-5">
      <FrameViewer frames={movie.frames} revealed={revealed} current={viewing} onSelect={setViewing} />

      {finished ? (
        <div className="animate-pop">{result}</div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-sm text-zinc-400">
              Tentativa <strong className="text-zinc-100">{guesses.length + 1}</strong> de {MAX_ATTEMPTS} · vale{' '}
              <strong className="text-amber-300">{points}</strong> {points === 1 ? 'ponto' : 'pontos'}
            </p>
            <AttemptPips guesses={guesses} finished={finished} />
          </div>
          <GuessInput
            attempt={guesses.length + 1}
            wrongCount={guesses.filter((g) => g.result === 'wrong').length}
            onGuess={(text) => guess({ text, result: isCorrectGuess(movie, text) ? 'correct' : 'wrong' })}
            onSkip={() => guess({ text: '', result: 'skip' })}
          />
        </div>
      )}

      <GuessList guesses={guesses} />
    </div>
  )
}
