type LeadFailureProps = {
  title: string
  message: string
}

export function LeadFailure({ title, message }: LeadFailureProps) {
  return (
    <div className="panel" role="alert">
      <h2>{title}</h2>
      {message !== title ? <p>{message}</p> : null}
    </div>
  )
}
