interface Talk {
  title: string;
  place: string;
  date: string;
  slide: string;
}

export function useTalks() {
  return useAsyncData(
    'QUERY_TALKS',
    () => {
      return queryContent('/talks')
        .without(['_'])
        .only(['title', 'talks'])
        .findOne();
    },
    {
      transform(result) {
        const talks: { year: string; content: any[] }[] = [];

        let group: any[] = [];
        let year: string | null = null;
        // console.log(typeof result.talks);

        result.talks.forEach((talk: Talk) => {
          let current: string;
          if (
            (current = talk.date.slice(0, 4)) !== year &&
            typeof year === 'string'
          ) {
            talks.push({
              year,
              content: group,
            });

            group = [];
          }

          year = current;
          group.push(talk);
        });

        if (typeof year === 'string' && group.length) {
          talks.push({
            year,
            content: group,
          });
        }

        return {
          ...result,
          talks,
        };
      },
    }
  );
}
